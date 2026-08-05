using System.Text;
using System.Net;
using Nawishta.NaturalDictionary.Models;

namespace Nawishta.NaturalDictionary.Export;

/// <summary>
/// Exports a dictionary to Kobo dicthtml format.
/// 
/// Kobo dictionaries are ZIP files named dicthtml-LOCALE.zip containing:
/// - Multiple PREFIX.html files (grouped by 2-char lowercase prefix of the headword)
/// - A "words" file listing all headwords/variants (one per line)
///
/// Each HTML file contains &lt;w&gt; entries with:
/// - &lt;a name="HEADWORD" /&gt; for the headword
/// - Optional &lt;var&gt;&lt;variant name="VARIANT"/&gt;&lt;/var&gt; for alternate forms
/// - HTML definition content
///
/// See: https://pgaskin.net/dictutil/dicthtml/format.html
/// </summary>
public sealed class KoboExporter : IDictionaryExporter
{
    public DictionaryFormat Format => DictionaryFormat.Unknown;
    public string FileExtension => ".zip";

    public Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);

        // Sort articles alphabetically
        var sorted = articles
            .OrderBy(a => a.Headword, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Group articles by 2-char prefix
        var grouped = sorted
            .GroupBy(a => GetPrefix(a.Headword))
            .OrderBy(g => g.Key)
            .ToList();

        var createdFiles = new List<string>();
        var allWords = new List<string>();

        // Write PREFIX.html files
        foreach (var group in grouped)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var htmlPath = Path.Combine(outputDirectory, group.Key + ".html");
            using var writer = new StreamWriter(htmlPath, false, Encoding.UTF8);

            writer.WriteLine("<html>");

            foreach (var article in group)
            {
                var headword = article.Headword.Trim();
                var headwordEscaped = WebUtility.HtmlEncode(headword);

                writer.WriteLine("<w>");
                writer.Write($"<p><a name=\"{headword}\" /><b>{headwordEscaped}</b>");

                // Add pronunciation if available
                if (!string.IsNullOrWhiteSpace(article.Pronunciation))
                    writer.Write($" <i>[{WebUtility.HtmlEncode(article.Pronunciation)}]</i>");

                // Add first POS if available
                var firstPos = article.Senses.FirstOrDefault()?.PartOfSpeech;
                if (!string.IsNullOrWhiteSpace(firstPos))
                    writer.Write($" -{WebUtility.HtmlEncode(firstPos)}");

                writer.WriteLine("</p>");

                // Variants
                writer.WriteLine("<var>");
                allWords.Add(headword);

                // Add lowercase variant
                var lower = headword.ToLowerInvariant();
                if (lower != headword)
                {
                    writer.WriteLine($"<variant name=\"{lower}\"/>");
                    allWords.Add(lower);
                }

                // Add alternates as variants
                if (!string.IsNullOrWhiteSpace(article.Alternates))
                {
                    try
                    {
                        var alts = System.Text.Json.JsonSerializer.Deserialize<List<string>>(article.Alternates);
                        if (alts != null)
                        {
                            foreach (var alt in alts)
                            {
                                var trimAlt = alt.Trim().ToLowerInvariant();
                                writer.WriteLine($"<variant name=\"{trimAlt}\"/>");
                                allWords.Add(trimAlt);
                            }
                        }
                    }
                    catch { /* ignore parse errors */ }
                }
                writer.WriteLine("</var>");

                // Definition HTML
                RenderDefinitionHtml(writer, article);

                writer.WriteLine("</w>");
            }

            writer.WriteLine("</html>");
            createdFiles.Add(htmlPath);
        }

        // Write "words" file (plain text, one word per line)
        var wordsPath = Path.Combine(outputDirectory, "words");
        File.WriteAllLines(wordsPath, allWords.Distinct().OrderBy(w => w), Encoding.UTF8);
        createdFiles.Add(wordsPath);

        return Task.FromResult<IReadOnlyList<string>>(createdFiles);
    }

    private static void RenderDefinitionHtml(StreamWriter writer, NaturalDictionaryArticle article)
    {
        if (article.Senses.Count > 0)
        {
            foreach (var sense in article.Senses)
            {
                if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
                    writer.Write($"<p><b><i>{WebUtility.HtmlEncode(sense.PartOfSpeech)}</i></b>");
                if (!string.IsNullOrWhiteSpace(sense.Grammar))
                    writer.Write($" <span style=\"color:gray\">({WebUtility.HtmlEncode(sense.Grammar)})</span>");
                if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
                    writer.WriteLine("</p>");

                writer.WriteLine("<ol>");
                foreach (var meaning in sense.Meanings)
                {
                    writer.Write("<li>");
                    if (!string.IsNullOrWhiteSpace(meaning.Label))
                        writer.Write($"<i>({WebUtility.HtmlEncode(meaning.Label)})</i> ");
                    writer.Write(WebUtility.HtmlEncode(meaning.Definition));

                    if (meaning.Examples.Count > 0)
                    {
                        writer.Write("<br/>");
                        foreach (var ex in meaning.Examples)
                            writer.Write($"<i style=\"color:gray\">\"{WebUtility.HtmlEncode(ex)}\"</i><br/>");
                    }
                    writer.WriteLine("</li>");
                }
                writer.WriteLine("</ol>");
            }

            // Links
            if (article.Links.Count > 0)
            {
                var grouped = article.Links.GroupBy(l => l.LinkType);
                writer.Write("<p style=\"color:gray;font-size:small\">");
                foreach (var group in grouped)
                {
                    writer.Write($"<b>{group.Key}:</b> ");
                    writer.Write(string.Join(", ", group.Select(l => WebUtility.HtmlEncode(l.TargetWord))));
                    writer.Write(" ");
                }
                writer.WriteLine("</p>");
            }
        }
        else if (!string.IsNullOrWhiteSpace(article.RawDefinition))
        {
            writer.WriteLine(article.RawDefinition);
        }
        else
        {
            writer.WriteLine("<p>(no definition)</p>");
        }
    }

    /// <summary>
    /// Get the 2-character lowercase prefix for grouping into HTML files.
    /// </summary>
    private static string GetPrefix(string headword)
    {
        var clean = headword.Trim().ToLowerInvariant();
        if (clean.Length == 0) return "00";
        if (clean.Length == 1) return clean + "_";
        return clean[..2];
    }
}
