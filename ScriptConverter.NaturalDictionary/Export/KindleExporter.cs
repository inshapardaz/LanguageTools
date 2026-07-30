using System.Text;
using System.Net;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Export;

/// <summary>
/// Exports a dictionary to Kindle-compatible format (OPF + HTML).
/// 
/// Produces an OPF package that can be converted to MOBI using kindlegen or
/// to EPUB using Calibre for use on Kindle devices.
///
/// Kindle dictionary HTML uses:
/// - &lt;idx:entry&gt; for each dictionary entry
/// - &lt;idx:orth&gt; for the headword (with optional &lt;idx:infl&gt; for inflections)
/// - Standard HTML for the definition body
///
/// The output includes:
/// - content.opf (OPF package descriptor)
/// - Multiple content_N.html files (split for performance, ~1000 entries each)
/// </summary>
public sealed class KindleExporter : IDictionaryExporter
{
    public DictionaryFormat Format => DictionaryFormat.Unknown;
    public string FileExtension => ".opf";

    private const int EntriesPerFile = 1000;

    public Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);

        var sorted = articles
            .OrderBy(a => a.Headword, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var createdFiles = new List<string>();
        var htmlFiles = new List<string>();

        // Split into multiple HTML files for performance
        var chunks = sorted
            .Select((a, i) => (Article: a, Index: i))
            .GroupBy(x => x.Index / EntriesPerFile)
            .ToList();

        foreach (var chunk in chunks)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = $"content_{chunk.Key:D4}.html";
            var filePath = Path.Combine(outputDirectory, fileName);
            htmlFiles.Add(fileName);

            using var writer = new StreamWriter(filePath, false, Encoding.UTF8);
            WriteHtmlHeader(writer);

            foreach (var (article, _) in chunk)
            {
                WriteEntry(writer, article);
            }

            WriteHtmlFooter(writer);
            createdFiles.Add(filePath);
        }

        // Write OPF file
        var opfPath = Path.Combine(outputDirectory, "content.opf");
        WriteOpf(opfPath, info, htmlFiles);
        createdFiles.Add(opfPath);

        // Write a cover page (optional but Kindle likes it)
        var coverPath = Path.Combine(outputDirectory, "cover.html");
        WriteCoverPage(coverPath, info);
        createdFiles.Add(coverPath);

        return Task.FromResult<IReadOnlyList<string>>(createdFiles);
    }

    private static void WriteHtmlHeader(StreamWriter writer)
    {
        writer.WriteLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        writer.WriteLine("<html xmlns:idx=\"urn:idx\" xmlns:mbp=\"urn:mbp\" xmlns:mmc=\"urn:mmc\">");
        writer.WriteLine("<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/></head>");
        writer.WriteLine("<body>");
        writer.WriteLine("<mbp:frameset>");
    }

    private static void WriteHtmlFooter(StreamWriter writer)
    {
        writer.WriteLine("</mbp:frameset>");
        writer.WriteLine("</body>");
        writer.WriteLine("</html>");
    }

    private static void WriteEntry(StreamWriter writer, NaturalDictionaryArticle article)
    {
        var headword = article.Headword.Trim();
        var headwordEncoded = WebUtility.HtmlEncode(headword);

        writer.WriteLine("<idx:entry>");
        writer.WriteLine($"<idx:orth>{headwordEncoded}");

        // Add inflections/variants
        if (!string.IsNullOrWhiteSpace(article.Alternates))
        {
            try
            {
                var alts = System.Text.Json.JsonSerializer.Deserialize<List<string>>(article.Alternates);
                if (alts != null)
                {
                    writer.WriteLine("<idx:infl>");
                    foreach (var alt in alts)
                    {
                        writer.WriteLine($"  <idx:iform value=\"{WebUtility.HtmlEncode(alt.Trim())}\"/>");
                    }
                    writer.WriteLine("</idx:infl>");
                }
            }
            catch { /* ignore */ }
        }

        writer.WriteLine("</idx:orth>");

        // Definition body
        writer.Write("<p>");

        // Pronunciation
        if (!string.IsNullOrWhiteSpace(article.Pronunciation))
            writer.Write($"<i>[{WebUtility.HtmlEncode(article.Pronunciation)}]</i> ");

        writer.WriteLine("</p>");

        // Senses
        if (article.Senses.Count > 0)
        {
            foreach (var sense in article.Senses)
            {
                if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
                {
                    writer.Write("<p><b><i>");
                    writer.Write(WebUtility.HtmlEncode(sense.PartOfSpeech));
                    writer.Write("</i></b>");
                    if (!string.IsNullOrWhiteSpace(sense.Grammar))
                        writer.Write($" ({WebUtility.HtmlEncode(sense.Grammar)})");
                    writer.WriteLine("</p>");
                }

                for (int i = 0; i < sense.Meanings.Count; i++)
                {
                    var m = sense.Meanings[i];
                    writer.Write("<p>");
                    if (sense.Meanings.Count > 1)
                        writer.Write($"<b>{i + 1}.</b> ");
                    if (!string.IsNullOrWhiteSpace(m.Label))
                        writer.Write($"<i>({WebUtility.HtmlEncode(m.Label)})</i> ");
                    writer.Write(WebUtility.HtmlEncode(m.Definition));
                    writer.WriteLine("</p>");

                    foreach (var ex in m.Examples)
                    {
                        writer.WriteLine($"<p style=\"margin-left:1em;color:gray\"><i>\"{WebUtility.HtmlEncode(ex)}\"</i></p>");
                    }
                }
            }

            // Links
            if (article.Links.Count > 0)
            {
                var grouped = article.Links.GroupBy(l => l.LinkType);
                foreach (var group in grouped)
                {
                    writer.Write("<p><small><b>");
                    writer.Write(WebUtility.HtmlEncode(group.Key.ToString()));
                    writer.Write(":</b> ");
                    writer.Write(string.Join(", ", group.Select(l => WebUtility.HtmlEncode(l.TargetWord))));
                    writer.WriteLine("</small></p>");
                }
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

        writer.WriteLine("<hr/>");
        writer.WriteLine("</idx:entry>");
    }

    private static void WriteOpf(string path, NaturalDictionaryInfo info, List<string> htmlFiles)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        sb.AppendLine("<package unique-identifier=\"uid\">");
        sb.AppendLine("<metadata>");
        sb.AppendLine($"  <dc-metadata xmlns:dc=\"http://purl.org/metadata/dublin_core\">");
        sb.AppendLine($"    <dc:Title>{WebUtility.HtmlEncode(info.Name)}</dc:Title>");
        sb.AppendLine($"    <dc:Creator>ScriptConverter Dictionary Export</dc:Creator>");
        sb.AppendLine($"    <dc:Language>{info.SourceLanguage ?? "en"}</dc:Language>");
        sb.AppendLine($"  </dc-metadata>");
        sb.AppendLine($"  <x-metadata>");
        sb.AppendLine($"    <DictionaryInLanguage>{info.SourceLanguage ?? "en"}</DictionaryInLanguage>");
        sb.AppendLine($"    <DictionaryOutLanguage>{info.TargetLanguage ?? "en"}</DictionaryOutLanguage>");
        sb.AppendLine($"    <DefaultLookupIndex>headword</DefaultLookupIndex>");
        sb.AppendLine($"  </x-metadata>");
        sb.AppendLine("</metadata>");
        sb.AppendLine("<manifest>");
        sb.AppendLine("  <item id=\"cover\" href=\"cover.html\" media-type=\"text/x-oeb1-document\"/>");
        for (int i = 0; i < htmlFiles.Count; i++)
        {
            sb.AppendLine($"  <item id=\"dict{i}\" href=\"{htmlFiles[i]}\" media-type=\"text/x-oeb1-document\"/>");
        }
        sb.AppendLine("</manifest>");
        sb.AppendLine("<spine>");
        sb.AppendLine("  <itemref idref=\"cover\"/>");
        for (int i = 0; i < htmlFiles.Count; i++)
        {
            sb.AppendLine($"  <itemref idref=\"dict{i}\"/>");
        }
        sb.AppendLine("</spine>");
        sb.AppendLine("</package>");

        File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
    }

    private static void WriteCoverPage(string path, NaturalDictionaryInfo info)
    {
        var sb = new StringBuilder();
        sb.AppendLine("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
        sb.AppendLine("<html>");
        sb.AppendLine("<head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"/></head>");
        sb.AppendLine("<body>");
        sb.AppendLine($"<h1>{WebUtility.HtmlEncode(info.Name)}</h1>");
        if (!string.IsNullOrWhiteSpace(info.Description))
            sb.AppendLine($"<p>{WebUtility.HtmlEncode(info.Description)}</p>");
        sb.AppendLine($"<p>Entries: {info.EntryCount}</p>");
        if (!string.IsNullOrWhiteSpace(info.SourceLanguage))
            sb.AppendLine($"<p>Language: {WebUtility.HtmlEncode(info.SourceLanguage)}</p>");
        sb.AppendLine("</body>");
        sb.AppendLine("</html>");

        File.WriteAllText(path, sb.ToString(), Encoding.UTF8);
    }
}
