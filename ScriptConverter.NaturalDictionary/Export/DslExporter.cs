using System.Text;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Export;

/// <summary>
/// Exports a dictionary to ABBYY Lingvo DSL format (.dsl).
/// 
/// DSL format:
/// - Header directives: #NAME, #INDEX_LANGUAGE, #CONTENTS_LANGUAGE
/// - Headwords at column 0
/// - Definition lines indented with a tab
/// - Uses DSL markup tags: [b], [i], [c], [m], [trn], [ex], [ref], etc.
/// </summary>
public sealed class DslExporter : IDictionaryExporter
{
    public DictionaryFormat Format => DictionaryFormat.Dsl;
    public string FileExtension => ".dsl";

    public Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);

        var safeName = SanitizeFileName(info.Name);
        var dslPath = Path.Combine(outputDirectory, safeName + ".dsl");

        // DSL files are typically UTF-16LE
        using var writer = new StreamWriter(dslPath, false, Encoding.Unicode);

        // Header
        writer.WriteLine($"#NAME\t\"{info.Name}\"");
        if (!string.IsNullOrWhiteSpace(info.SourceLanguage))
            writer.WriteLine($"#INDEX_LANGUAGE\t\"{info.SourceLanguage}\"");
        if (!string.IsNullOrWhiteSpace(info.TargetLanguage))
            writer.WriteLine($"#CONTENTS_LANGUAGE\t\"{info.TargetLanguage}\"");
        writer.WriteLine();

        // Sort articles alphabetically
        var sorted = articles
            .OrderBy(a => a.Headword, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var article in sorted)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Headword (at column 0)
            writer.WriteLine(article.Headword);

            // Definition (each line indented with tab)
            var defLines = RenderDslDefinition(article);
            foreach (var line in defLines)
            {
                writer.Write('\t');
                writer.WriteLine(line);
            }

            writer.WriteLine(); // blank line between entries
        }

        var files = new List<string> { dslPath };
        return Task.FromResult<IReadOnlyList<string>>(files);
    }

    private static List<string> RenderDslDefinition(NaturalDictionaryArticle article)
    {
        var lines = new List<string>();

        // Pronunciation
        if (!string.IsNullOrWhiteSpace(article.Pronunciation))
            lines.Add($"[t]{article.Pronunciation}[/t]");

        foreach (var sense in article.Senses)
        {
            // Part of speech
            if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
            {
                var posLine = $"[m1][b]{sense.PartOfSpeech}[/b]";
                if (!string.IsNullOrWhiteSpace(sense.Grammar))
                    posLine += $" [i]({sense.Grammar})[/i]";
                posLine += "[/m]";
                lines.Add(posLine);
            }

            // Meanings
            for (int i = 0; i < sense.Meanings.Count; i++)
            {
                var m = sense.Meanings[i];
                var numPrefix = sense.Meanings.Count > 1 ? $"{i + 1}) " : "";
                var labelPart = !string.IsNullOrWhiteSpace(m.Label) ? $"[i]({m.Label})[/i] " : "";

                lines.Add($"[m2]{numPrefix}{labelPart}[trn]{m.Definition}[/trn][/m]");

                // Examples
                foreach (var ex in m.Examples)
                {
                    lines.Add($"[m3][ex]{ex}[/ex][/m]");
                }
            }
        }

        // Links
        if (article.Links.Count > 0)
        {
            var grouped = article.Links.GroupBy(l => l.LinkType);
            foreach (var group in grouped)
            {
                var label = group.Key switch
                {
                    WordLinkType.Synonym => "Syn",
                    WordLinkType.Antonym => "Ant",
                    WordLinkType.Root => "Root",
                    WordLinkType.DerivedForm => "Derived",
                    WordLinkType.Related => "Related",
                    WordLinkType.SeeAlso => "See also",
                    _ => group.Key.ToString(),
                };

                var refs = string.Join(", ", group.Select(l => $"[ref]{l.TargetWord}[/ref]"));
                lines.Add($"[m2][b]{label}:[/b] {refs}[/m]");
            }
        }

        // Fallback if no structured data
        if (lines.Count == 0 && !string.IsNullOrWhiteSpace(article.RawDefinition))
        {
            // Strip HTML for DSL raw fallback
            var plain = System.Text.RegularExpressions.Regex.Replace(
                article.RawDefinition, @"<[^>]+>", "");
            lines.Add(plain.Trim());
        }

        if (lines.Count == 0)
            lines.Add("(no definition)");

        return lines;
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return sanitized.Length > 50 ? sanitized[..50] : sanitized;
    }
}
