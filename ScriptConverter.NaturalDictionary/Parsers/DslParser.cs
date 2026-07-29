using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Parsers;

/// <summary>
/// Parser for ABBYY Lingvo DSL dictionary format.
/// 
/// DSL format overview:
/// - File starts with optional #NAME, #INDEX_LANGUAGE, #CONTENTS_LANGUAGE directives
/// - Headwords are lines that start at position 0 (no leading whitespace)
/// - Multiple headwords can precede one definition block (alternate spellings)
/// - Definition lines are indented with a tab or spaces
/// - DSL uses its own markup: [b], [i], [u], [c], [ref], [url], [m], etc.
/// - Files may be UTF-16LE (with BOM) or UTF-8
/// - Can be gzip-compressed as .dsl.dz
/// </summary>
public sealed class DslParser : IDictionaryParser
{
    public DictionaryFormat Format => DictionaryFormat.Dsl;

    public bool CanParse(string directoryPath)
    {
        return Directory.EnumerateFiles(directoryPath, "*.dsl", SearchOption.AllDirectories).Any()
            || Directory.EnumerateFiles(directoryPath, "*.dsl.dz", SearchOption.AllDirectories).Any();
    }

    public async Task<ParsedDictionary> ParseAsync(string directoryPath, CancellationToken cancellationToken = default)
    {
        // Find .dsl or .dsl.dz file
        var dslPath = Directory.EnumerateFiles(directoryPath, "*.dsl", SearchOption.AllDirectories)
            .FirstOrDefault();

        dslPath ??= Directory.EnumerateFiles(directoryPath, "*.dsl.dz", SearchOption.AllDirectories)
            .FirstOrDefault();

        if (dslPath == null)
            throw new InvalidOperationException("No .dsl or .dsl.dz file found in the provided directory.");

        // Read the file content
        var content = await ReadDslFileAsync(dslPath, cancellationToken);

        // Parse header directives and entries
        var (metadata, entries) = ParseContent(content, cancellationToken);

        var dictionaryId = Guid.NewGuid().ToString("N")[..12];
        var baseName = Path.GetFileNameWithoutExtension(
            dslPath.EndsWith(".dz", StringComparison.OrdinalIgnoreCase)
                ? Path.GetFileNameWithoutExtension(dslPath)
                : dslPath);

        var articles = new List<NaturalDictionaryArticle>(entries.Count);

        foreach (var (headwords, definition) in entries)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var primaryHeadword = headwords[0];
            var htmlDef = DslMarkupToHtml(definition);

            string? alternates = headwords.Count > 1
                ? System.Text.Json.JsonSerializer.Serialize(headwords.Skip(1).ToList())
                : null;

            articles.Add(new NaturalDictionaryArticle
            {
                DictionaryId = dictionaryId,
                Headword = primaryHeadword,
                Definition = htmlDef,
                Alternates = alternates,
            });
        }

        var info = new NaturalDictionaryInfo
        {
            Id = dictionaryId,
            Name = metadata.GetValueOrDefault("NAME", baseName),
            Format = DictionaryFormat.Dsl,
            EntryCount = articles.Count,
            SourceLanguage = metadata.GetValueOrDefault("INDEX_LANGUAGE"),
            TargetLanguage = metadata.GetValueOrDefault("CONTENTS_LANGUAGE"),
        };

        return new ParsedDictionary { Info = info, Articles = articles };
    }

    private static async Task<string> ReadDslFileAsync(string path, CancellationToken ct)
    {
        byte[] rawBytes;

        if (path.EndsWith(".dz", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
        {
            await using var fileStream = File.OpenRead(path);
            await using var gzStream = new GZipStream(fileStream, CompressionMode.Decompress);
            using var memStream = new MemoryStream();
            await gzStream.CopyToAsync(memStream, ct);
            rawBytes = memStream.ToArray();
        }
        else
        {
            rawBytes = await File.ReadAllBytesAsync(path, ct);
        }

        // Detect encoding: DSL files are often UTF-16LE with BOM
        var encoding = DetectEncoding(rawBytes);
        return encoding.GetString(rawBytes);
    }

    private static Encoding DetectEncoding(byte[] data)
    {
        if (data.Length >= 2)
        {
            // UTF-16 LE BOM: FF FE
            if (data[0] == 0xFF && data[1] == 0xFE)
                return Encoding.Unicode;

            // UTF-16 BE BOM: FE FF
            if (data[0] == 0xFE && data[1] == 0xFF)
                return Encoding.BigEndianUnicode;

            // UTF-8 BOM: EF BB BF
            if (data.Length >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF)
                return Encoding.UTF8;
        }

        return Encoding.UTF8;
    }

    private static (Dictionary<string, string> Metadata, List<(List<string> Headwords, string Definition)> Entries)
        ParseContent(string content, CancellationToken ct)
    {
        var metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var entries = new List<(List<string> Headwords, string Definition)>();

        using var reader = new StringReader(content);
        var currentHeadwords = new List<string>();
        var currentDefinition = new StringBuilder();

        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            ct.ThrowIfCancellationRequested();

            // Skip empty lines
            if (string.IsNullOrWhiteSpace(line))
                continue;

            // Header directive: #NAME "Dictionary Name"
            if (line.StartsWith('#'))
            {
                var match = Regex.Match(line, @"^#(\w+)\s+""?(.+?)""?\s*$");
                if (match.Success)
                {
                    metadata[match.Groups[1].Value] = match.Groups[2].Value;
                }
                continue;
            }

            // Is this a headword line (no leading whitespace/tab)?
            bool isHeadword = line.Length > 0 && line[0] != '\t' && line[0] != ' ';

            if (isHeadword)
            {
                // If we have a pending entry, save it
                if (currentHeadwords.Count > 0 && currentDefinition.Length > 0)
                {
                    entries.Add((new List<string>(currentHeadwords), currentDefinition.ToString().Trim()));
                    currentDefinition.Clear();
                }

                if (currentDefinition.Length == 0 && currentHeadwords.Count > 0 &&
                    entries.Count == 0 || (currentHeadwords.Count > 0 && currentDefinition.Length == 0))
                {
                    // Accumulate alternate headwords (multiple headwords before one definition)
                    if (currentDefinition.Length > 0)
                    {
                        entries.Add((new List<string>(currentHeadwords), currentDefinition.ToString().Trim()));
                        currentDefinition.Clear();
                        currentHeadwords.Clear();
                    }
                }
                else
                {
                    currentHeadwords.Clear();
                }

                // Clean up headword: remove {curly braces} used for optional parts in DSL
                var headword = CleanHeadword(line.Trim());
                if (!string.IsNullOrWhiteSpace(headword))
                    currentHeadwords.Add(headword);
            }
            else
            {
                // Definition line — strip leading tab/space
                var defLine = line.TrimStart('\t', ' ');
                currentDefinition.AppendLine(defLine);
            }
        }

        // Don't forget the last entry
        if (currentHeadwords.Count > 0 && currentDefinition.Length > 0)
        {
            entries.Add((new List<string>(currentHeadwords), currentDefinition.ToString().Trim()));
        }

        return (metadata, entries);
    }

    /// <summary>
    /// Remove DSL headword markers: {optional} parts and backslash escapes.
    /// </summary>
    private static string CleanHeadword(string raw)
    {
        // Remove {curly brace} optional parts — include them in the headword
        var result = raw.Replace("{", "").Replace("}", "");
        // Remove backslash escapes
        result = result.Replace("\\", "");
        return result.Trim();
    }

    /// <summary>
    /// Convert DSL markup tags to simple HTML for display.
    /// DSL tags: [b], [i], [u], [c], [*], [ref], [url], [m], [m1]-[m9], [trn], [ex], etc.
    /// </summary>
    private static string DslMarkupToHtml(string dsl)
    {
        if (string.IsNullOrEmpty(dsl))
            return string.Empty;

        var html = dsl;

        // Bold
        html = Regex.Replace(html, @"\[b\]", "<b>");
        html = Regex.Replace(html, @"\[/b\]", "</b>");

        // Italic
        html = Regex.Replace(html, @"\[i\]", "<i>");
        html = Regex.Replace(html, @"\[/i\]", "</i>");

        // Underline
        html = Regex.Replace(html, @"\[u\]", "<u>");
        html = Regex.Replace(html, @"\[/u\]", "</u>");

        // Color: [c blue]...[/c] → <span style="color:blue">...</span>
        html = Regex.Replace(html, @"\[c\s*(\w*)\]", m =>
        {
            var color = m.Groups[1].Value;
            return string.IsNullOrEmpty(color)
                ? "<span class=\"dsl-color\">"
                : $"<span style=\"color:{color}\">";
        });
        html = Regex.Replace(html, @"\[/c\]", "</span>");

        // Margin/indent: [m1]-[m9] → <div class="m1">
        html = Regex.Replace(html, @"\[m(\d?)\]", m =>
        {
            var level = m.Groups[1].Value;
            return $"<div class=\"indent-{(string.IsNullOrEmpty(level) ? "1" : level)}\">";
        });
        html = Regex.Replace(html, @"\[/m\]", "</div>");

        // Translation zone
        html = Regex.Replace(html, @"\[trn\]", "<span class=\"translation\">");
        html = Regex.Replace(html, @"\[/trn\]", "</span>");

        // Example
        html = Regex.Replace(html, @"\[ex\]", "<span class=\"example\">");
        html = Regex.Replace(html, @"\[/ex\]", "</span>");

        // Commentary/notes
        html = Regex.Replace(html, @"\[com\]", "<span class=\"comment\">");
        html = Regex.Replace(html, @"\[/com\]", "</span>");

        // Cross-reference
        html = Regex.Replace(html, @"\[ref\]", "<a class=\"cross-ref\">");
        html = Regex.Replace(html, @"\[/ref\]", "</a>");

        // URL links
        html = Regex.Replace(html, @"\[url\]", "<a href=\"\">");
        html = Regex.Replace(html, @"\[/url\]", "</a>");

        // Paragraph/line break
        html = Regex.Replace(html, @"\[p\]", "<p>");
        html = Regex.Replace(html, @"\[/p\]", "</p>");

        // Superscript
        html = Regex.Replace(html, @"\[sup\]", "<sup>");
        html = Regex.Replace(html, @"\[/sup\]", "</sup>");

        // Subscript
        html = Regex.Replace(html, @"\[sub\]", "<sub>");
        html = Regex.Replace(html, @"\[/sub\]", "</sub>");

        // Stress mark (just remove)
        html = Regex.Replace(html, @"\['\]", "ˈ");
        html = Regex.Replace(html, @"\[/'\]", "");

        // Abbreviation tags and other unhandled tags — strip them
        html = Regex.Replace(html, @"\[\*\]", "");
        html = Regex.Replace(html, @"\[/\*\]", "");
        html = Regex.Replace(html, @"\[lang[^\]]*\]", "");
        html = Regex.Replace(html, @"\[/lang\]", "");

        // Strip any remaining unrecognised DSL tags
        html = Regex.Replace(html, @"\[[^\]]+\]", "");

        // Escaped characters
        html = html.Replace("\\[", "[").Replace("\\]", "]");

        // Convert line breaks to <br> for HTML rendering
        html = html.Replace("\r\n", "\n").Replace("\n", "<br>\n");

        return html;
    }
}
