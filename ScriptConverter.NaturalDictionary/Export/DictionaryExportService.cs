using System.IO.Compression;
using ScriptConverter.NaturalDictionary.Models;
using ScriptConverter.NaturalDictionary.Storage;

namespace ScriptConverter.NaturalDictionary.Export;

/// <summary>
/// Supported export formats.
/// </summary>
public enum ExportFormat
{
    StarDict,
    Dsl,
    Json,
    Kobo,
    Kindle,
}

/// <summary>
/// Service that exports a dictionary from the database to a downloadable zip archive
/// in the specified format (StarDict, DSL, or JSON).
/// </summary>
public sealed class DictionaryExportService
{
    private readonly INaturalDictionaryStore _store;
    private readonly Dictionary<ExportFormat, IDictionaryExporter> _exporters;

    public DictionaryExportService(INaturalDictionaryStore store)
    {
        _store = store;
        _exporters = new Dictionary<ExportFormat, IDictionaryExporter>
        {
            [ExportFormat.StarDict] = new StarDictExporter(),
            [ExportFormat.Dsl] = new DslExporter(),
            [ExportFormat.Json] = new JsonExporter(),
            [ExportFormat.Kobo] = new KoboExporter(),
            [ExportFormat.Kindle] = new KindleExporter(),
        };
    }

    /// <summary>
    /// Export a dictionary as a zip archive in the specified format.
    /// Returns the zip file as a byte array, or null if the dictionary doesn't exist.
    /// </summary>
    public async Task<ExportResult?> ExportAsync(
        string dictionaryId,
        ExportFormat format,
        CancellationToken cancellationToken = default)
    {
        var info = await _store.GetDictionaryAsync(dictionaryId, cancellationToken);
        if (info == null)
            return null;

        // Load all articles (paginate through them)
        var allArticles = new List<NaturalDictionaryArticle>();
        int page = 1;
        const int pageSize = 1000;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var result = await _store.BrowseAsync(dictionaryId, page, pageSize, cancellationToken);
            allArticles.AddRange(result.Articles);
            if (page >= result.TotalPages)
                break;
            page++;
        }

        if (!_exporters.TryGetValue(format, out var exporter))
            throw new ArgumentException($"Unsupported export format: {format}");

        // Export to a temp directory
        var tempDir = Path.Combine(Path.GetTempPath(), "dictexport_" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(tempDir);

        try
        {
            var files = await exporter.ExportAsync(info, allArticles, tempDir, cancellationToken);

            // Create zip archive in memory
            using var zipStream = new MemoryStream();
            using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Create, leaveOpen: true))
            {
                foreach (var filePath in files)
                {
                    var entryName = Path.GetFileName(filePath);
                    var entry = archive.CreateEntry(entryName, CompressionLevel.Optimal);
                    await using var entryStream = entry.Open();
                    await using var fileStream = File.OpenRead(filePath);
                    await fileStream.CopyToAsync(entryStream, cancellationToken);
                }
            }

            var safeName = SanitizeFileName(info.Name);
            var zipFileName = $"{safeName}_{format.ToString().ToLowerInvariant()}.zip";

            return new ExportResult
            {
                FileName = zipFileName,
                ContentType = "application/zip",
                Data = zipStream.ToArray(),
            };
        }
        finally
        {
            try { Directory.Delete(tempDir, recursive: true); }
            catch { /* best effort cleanup */ }
        }
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return sanitized.Length > 50 ? sanitized[..50] : sanitized;
    }
}

/// <summary>
/// Result of a dictionary export operation.
/// </summary>
public sealed class ExportResult
{
    /// <summary>Suggested filename for download.</summary>
    public required string FileName { get; set; }

    /// <summary>MIME content type.</summary>
    public required string ContentType { get; set; }

    /// <summary>The file data.</summary>
    public required byte[] Data { get; set; }
}
