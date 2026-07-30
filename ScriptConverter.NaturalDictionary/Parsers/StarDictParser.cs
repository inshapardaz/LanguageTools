using System.IO.Compression;
using System.Text;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Parsers;

/// <summary>
/// Parser for StarDict format dictionaries.
/// Reads .ifo (metadata), .idx (index), and .dict/.dict.dz (definitions).
/// 
/// StarDict .ifo format:
///   First line: "StarDict's dict ifo file"
///   Then key=value pairs: bookname, wordcount, idxfilesize, sametypesequence, etc.
///
/// StarDict .idx format:
///   Sequence of entries: null-terminated UTF-8 word + 4-byte big-endian offset + 4-byte big-endian size
///   (or 8-byte offset + 8-byte size if idxoffsetbits=64)
///
/// StarDict .dict format:
///   Raw data blob. Each entry's content is at offset..offset+size from the .idx.
///   If sametypesequence is set, all entries share the same type codes.
///   Common types: 'm' = plain text, 'h' = HTML, 'x' = XDXF
/// </summary>
public sealed class StarDictParser : IDictionaryParser
{
    public DictionaryFormat Format => DictionaryFormat.StarDict;

    public bool CanParse(string directoryPath)
    {
        return Directory.EnumerateFiles(directoryPath, "*.ifo", SearchOption.AllDirectories).Any();
    }

    public async Task<ParsedDictionary> ParseAsync(string directoryPath, CancellationToken cancellationToken = default)
    {
        // Find the .ifo file
        var ifoPath = Directory.EnumerateFiles(directoryPath, "*.ifo", SearchOption.AllDirectories)
            .FirstOrDefault()
            ?? throw new InvalidOperationException("No .ifo file found in the provided directory.");

        var baseDir = Path.GetDirectoryName(ifoPath)!;
        var baseName = Path.GetFileNameWithoutExtension(ifoPath);

        // Parse .ifo metadata
        var ifoData = await ParseIfoAsync(ifoPath, cancellationToken);

        // Find .idx file
        var idxPath = Path.Combine(baseDir, baseName + ".idx");
        var idxGzPath = Path.Combine(baseDir, baseName + ".idx.gz");
        if (!File.Exists(idxPath) && File.Exists(idxGzPath))
            idxPath = idxGzPath;

        if (!File.Exists(idxPath))
            throw new InvalidOperationException($"Index file not found: {baseName}.idx");

        // Find .dict file (.dict, .dict.dz, or .dict.gz)
        var dictPath = FindDictFile(baseDir, baseName);
        if (dictPath == null)
            throw new InvalidOperationException($"Dictionary data file not found: {baseName}.dict");

        // Parse index
        var useOffset64 = ifoData.TryGetValue("idxoffsetbits", out var bits) && bits == "64";
        var idxBytes = await ReadFileOrCompressedAsync(idxPath, cancellationToken);
        var indexEntries = ParseIndex(idxBytes, useOffset64);

        // Read dictionary data
        var dictBytes = await ReadFileOrCompressedAsync(dictPath, cancellationToken);

        // Determine content type
        var typeSequence = ifoData.GetValueOrDefault("sametypesequence", "m");

        // Build articles (in a sync helper to allow Span usage)
        var dictionaryId = Guid.NewGuid().ToString("N")[..12];
        var articles = BuildArticles(indexEntries, dictBytes, typeSequence, dictionaryId, cancellationToken);

        var info = new NaturalDictionaryInfo
        {
            Id = dictionaryId,
            Name = ifoData.GetValueOrDefault("bookname", baseName),
            Format = DictionaryFormat.StarDict,
            EntryCount = articles.Count,
            Description = ifoData.GetValueOrDefault("description"),
            SourceLanguage = ifoData.GetValueOrDefault("sourcelang"),
            TargetLanguage = ifoData.GetValueOrDefault("targetlang"),
        };

        return new ParsedDictionary { Info = info, Articles = articles };
    }

    private static List<NaturalDictionaryArticle> BuildArticles(
        List<(string Headword, long Offset, long Size)> indexEntries,
        byte[] dictBytes,
        string typeSequence,
        string dictionaryId,
        CancellationToken cancellationToken)
    {
        var articles = new List<NaturalDictionaryArticle>(indexEntries.Count);

        foreach (var (headword, offset, size) in indexEntries)
        {
            cancellationToken.ThrowIfCancellationRequested();

            if (offset + size > dictBytes.Length)
                continue; // Skip corrupted entries

            var rawContent = dictBytes.AsSpan((int)offset, (int)size);
            var rawDefinition = ExtractDefinition(rawContent, typeSequence);

            // Attempt structured extraction from raw definition
            var (pronunciation, senses, links) = DefinitionStructurer.Extract(rawDefinition);

            articles.Add(new NaturalDictionaryArticle
            {
                DictionaryId = dictionaryId,
                Headword = headword,
                Pronunciation = pronunciation,
                Senses = senses,
                Links = links,
                RawDefinition = rawDefinition,
            });
        }

        return articles;
    }

    private static async Task<Dictionary<string, string>> ParseIfoAsync(
        string path, CancellationToken ct)
    {
        var lines = await File.ReadAllLinesAsync(path, Encoding.UTF8, ct);
        var data = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var line in lines.Skip(1)) // Skip magic line
        {
            var eqIdx = line.IndexOf('=');
            if (eqIdx <= 0) continue;
            var key = line[..eqIdx].Trim();
            var value = line[(eqIdx + 1)..].Trim();
            data[key] = value;
        }

        return data;
    }

    private static string? FindDictFile(string baseDir, string baseName)
    {
        // Try in order: .dict, .dict.dz, .dict.gz
        var candidates = new[]
        {
            Path.Combine(baseDir, baseName + ".dict"),
            Path.Combine(baseDir, baseName + ".dict.dz"),
            Path.Combine(baseDir, baseName + ".dict.gz"),
        };

        return candidates.FirstOrDefault(File.Exists);
    }

    private static async Task<byte[]> ReadFileOrCompressedAsync(string path, CancellationToken ct)
    {
        if (path.EndsWith(".gz", StringComparison.OrdinalIgnoreCase) ||
            path.EndsWith(".dz", StringComparison.OrdinalIgnoreCase))
        {
            await using var fileStream = File.OpenRead(path);
            await using var gzStream = new GZipStream(fileStream, CompressionMode.Decompress);
            using var memStream = new MemoryStream();
            await gzStream.CopyToAsync(memStream, ct);
            return memStream.ToArray();
        }

        return await File.ReadAllBytesAsync(path, ct);
    }

    /// <summary>
    /// Parse the .idx binary format:
    /// Each entry is: UTF-8 null-terminated string + 4-byte offset (big-endian) + 4-byte size (big-endian)
    /// </summary>
    private static List<(string Headword, long Offset, long Size)> ParseIndex(byte[] data, bool offset64)
    {
        var entries = new List<(string, long, long)>();
        int pos = 0;

        while (pos < data.Length)
        {
            // Find null terminator for the headword
            int nullPos = Array.IndexOf(data, (byte)0, pos);
            if (nullPos < 0) break;

            var headword = Encoding.UTF8.GetString(data, pos, nullPos - pos);
            pos = nullPos + 1;

            long offset;
            long size;

            if (offset64)
            {
                if (pos + 16 > data.Length) break;
                offset = ReadBigEndian64(data, pos);
                pos += 8;
                size = ReadBigEndian64(data, pos);
                pos += 8;
            }
            else
            {
                if (pos + 8 > data.Length) break;
                offset = ReadBigEndian32(data, pos);
                pos += 4;
                size = ReadBigEndian32(data, pos);
                pos += 4;
            }

            entries.Add((headword, offset, size));
        }

        return entries;
    }

    private static uint ReadBigEndian32(byte[] data, int offset)
    {
        return (uint)((data[offset] << 24) | (data[offset + 1] << 16) |
                      (data[offset + 2] << 8) | data[offset + 3]);
    }

    private static long ReadBigEndian64(byte[] data, int offset)
    {
        long hi = ReadBigEndian32(data, offset);
        long lo = ReadBigEndian32(data, offset + 4);
        return (hi << 32) | lo;
    }

    /// <summary>
    /// Extract definition content based on the sametypesequence.
    /// Common type codes: 'm' = plain text, 'h' = HTML, 'x' = XDXF, 'g' = Pango markup
    /// </summary>
    private static string ExtractDefinition(ReadOnlySpan<byte> data, string typeSequence)
    {
        if (data.IsEmpty)
            return string.Empty;

        // For single-type sequences, the entire data is the content
        if (typeSequence.Length == 1)
        {
            var content = Encoding.UTF8.GetString(data);
            // Trim trailing null if present
            return content.TrimEnd('\0');
        }

        // For multi-type sequences, each field is either:
        // - For lowercase type codes: null-terminated string
        // - For uppercase type codes: 4-byte size prefix + data
        var result = new StringBuilder();
        int pos = 0;

        foreach (var typeChar in typeSequence)
        {
            if (pos >= data.Length) break;

            if (char.IsUpper(typeChar))
            {
                // Uppercase: 4-byte big-endian size + data
                if (pos + 4 > data.Length) break;
                var size = (int)((data[pos] << 24) | (data[pos + 1] << 16) |
                                 (data[pos + 2] << 8) | data[pos + 3]);
                pos += 4;
                if (pos + size > data.Length) size = data.Length - pos;
                var field = Encoding.UTF8.GetString(data.Slice(pos, size));
                result.AppendLine(field);
                pos += size;
            }
            else
            {
                // Lowercase: null-terminated
                var nullIdx = data.Slice(pos).IndexOf((byte)0);
                int fieldLen = nullIdx >= 0 ? nullIdx : data.Length - pos;
                var field = Encoding.UTF8.GetString(data.Slice(pos, fieldLen));
                result.AppendLine(field);
                pos += fieldLen + (nullIdx >= 0 ? 1 : 0);
            }
        }

        return result.ToString().TrimEnd();
    }
}
