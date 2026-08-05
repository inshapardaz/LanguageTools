using System.Text;
using Nawishta.NaturalDictionary.Models;

namespace Nawishta.NaturalDictionary.Export;

/// <summary>
/// Exports a dictionary to StarDict format (.ifo + .idx + .dict).
/// 
/// .ifo: metadata key=value pairs
/// .idx: sorted entries — null-terminated UTF-8 headword + 4-byte BE offset + 4-byte BE size
/// .dict: concatenated definition data referenced by .idx offsets
/// </summary>
public sealed class StarDictExporter : IDictionaryExporter
{
    public DictionaryFormat Format => DictionaryFormat.StarDict;
    public string FileExtension => ".ifo";

    public Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);

        var safeName = SanitizeFileName(info.Name);
        var ifoPath = Path.Combine(outputDirectory, safeName + ".ifo");
        var idxPath = Path.Combine(outputDirectory, safeName + ".idx");
        var dictPath = Path.Combine(outputDirectory, safeName + ".dict");

        // Sort articles alphabetically by headword (case-insensitive)
        var sorted = articles
            .OrderBy(a => a.Headword, StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Build .dict and .idx simultaneously
        using var dictStream = new MemoryStream();
        using var idxStream = new MemoryStream();

        foreach (var article in sorted)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var definition = RenderDefinition(article);
            var defBytes = Encoding.UTF8.GetBytes(definition);

            var offset = (uint)dictStream.Position;
            var size = (uint)defBytes.Length;

            dictStream.Write(defBytes);

            // Write idx entry: null-terminated headword + 4-byte BE offset + 4-byte BE size
            var headwordBytes = Encoding.UTF8.GetBytes(article.Headword);
            idxStream.Write(headwordBytes);
            idxStream.WriteByte(0); // null terminator
            WriteBigEndian32(idxStream, offset);
            WriteBigEndian32(idxStream, size);
        }

        // Write .dict file
        File.WriteAllBytes(dictPath, dictStream.ToArray());

        // Write .idx file
        var idxBytes = idxStream.ToArray();
        File.WriteAllBytes(idxPath, idxBytes);

        // Write .ifo file
        var ifo = new StringBuilder();
        ifo.AppendLine("StarDict's dict ifo file");
        ifo.AppendLine($"version=2.4.2");
        ifo.AppendLine($"wordcount={sorted.Count}");
        ifo.AppendLine($"idxfilesize={idxBytes.Length}");
        ifo.AppendLine($"bookname={info.Name}");
        ifo.AppendLine($"sametypesequence=h");
        if (!string.IsNullOrWhiteSpace(info.Description))
            ifo.AppendLine($"description={info.Description}");

        File.WriteAllText(ifoPath, ifo.ToString(), Encoding.UTF8);

        var files = new List<string> { ifoPath, idxPath, dictPath };
        return Task.FromResult<IReadOnlyList<string>>(files);
    }

    /// <summary>
    /// Render an article's structured data as HTML for the StarDict .dict file.
    /// </summary>
    private static string RenderDefinition(NaturalDictionaryArticle article)
    {
        // If there's a raw definition, prefer it for lossless round-trip
        if (!string.IsNullOrWhiteSpace(article.RawDefinition))
            return article.RawDefinition;

        var sb = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(article.Pronunciation))
            sb.Append($"<span style=\"color:gray\">[{article.Pronunciation}]</span><br>");

        foreach (var sense in article.Senses)
        {
            if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
                sb.Append($"<b><i>{sense.PartOfSpeech}</i></b>");
            if (!string.IsNullOrWhiteSpace(sense.Grammar))
                sb.Append($" <span style=\"color:gray\">({sense.Grammar})</span>");
            if (!string.IsNullOrWhiteSpace(sense.PartOfSpeech))
                sb.Append("<br>");

            for (int i = 0; i < sense.Meanings.Count; i++)
            {
                var m = sense.Meanings[i];
                sb.Append($"{i + 1}. ");
                if (!string.IsNullOrWhiteSpace(m.Label))
                    sb.Append($"<i>({m.Label})</i> ");
                sb.Append(m.Definition);
                sb.Append("<br>");

                foreach (var ex in m.Examples)
                {
                    sb.Append($"&nbsp;&nbsp;<i>{ex}</i><br>");
                }
            }
        }

        if (article.Links.Count > 0)
        {
            var grouped = article.Links.GroupBy(l => l.LinkType);
            foreach (var group in grouped)
            {
                sb.Append($"<b>{group.Key}:</b> ");
                sb.Append(string.Join(", ", group.Select(l => l.TargetWord)));
                sb.Append("<br>");
            }
        }

        return sb.ToString();
    }

    private static void WriteBigEndian32(Stream stream, uint value)
    {
        stream.WriteByte((byte)(value >> 24));
        stream.WriteByte((byte)(value >> 16));
        stream.WriteByte((byte)(value >> 8));
        stream.WriteByte((byte)value);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return sanitized.Length > 50 ? sanitized[..50] : sanitized;
    }
}
