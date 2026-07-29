using System.IO.Compression;
using ScriptConverter.NaturalDictionary.Models;
using ScriptConverter.NaturalDictionary.Parsers;
using ScriptConverter.NaturalDictionary.Storage;

namespace ScriptConverter.NaturalDictionary.Services;

/// <summary>
/// Service that orchestrates dictionary import:
/// 1. Extracts uploaded archive (zip) to a temp directory
/// 2. Detects the dictionary format
/// 3. Parses the dictionary using the appropriate parser
/// 4. Stores the parsed entries in the database
/// </summary>
public sealed class DictionaryImportService
{
    private readonly IReadOnlyList<IDictionaryParser> _parsers;
    private readonly INaturalDictionaryStore _store;

    public DictionaryImportService(
        IEnumerable<IDictionaryParser> parsers,
        INaturalDictionaryStore store)
    {
        _parsers = parsers.ToList();
        _store = store;
    }

    /// <summary>
    /// Import a dictionary from an uploaded file (zip archive or raw dictionary file).
    /// </summary>
    /// <param name="fileStream">The uploaded file stream.</param>
    /// <param name="fileName">Original filename (used for format detection).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Info about the imported dictionary.</returns>
    public async Task<NaturalDictionaryInfo> ImportAsync(
        Stream fileStream,
        string fileName,
        CancellationToken cancellationToken = default)
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "dictimport_" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(tempDir);

        try
        {
            // Extract or copy files to temp directory
            await ExtractToDirectoryAsync(fileStream, fileName, tempDir, cancellationToken);

            // Detect format and parse
            var parser = DetectParser(tempDir);
            if (parser == null)
            {
                throw new InvalidOperationException(
                    "Unable to detect dictionary format. Supported formats: StarDict (.ifo/.idx/.dict), DSL (.dsl). " +
                    "Please upload a zip archive containing the dictionary files.");
            }

            var parsed = await parser.ParseAsync(tempDir, cancellationToken);
            parsed.Info.OriginalFileName = fileName;

            // Store in database
            await _store.CreateDictionaryAsync(parsed.Info, parsed.Articles, cancellationToken);

            return parsed.Info;
        }
        finally
        {
            // Clean up temp directory
            try { Directory.Delete(tempDir, recursive: true); }
            catch { /* best effort cleanup */ }
        }
    }

    /// <summary>
    /// Detect the dictionary format by checking which parser can handle the extracted files.
    /// </summary>
    public DictionaryFormat? DetectFormat(string directoryPath)
    {
        var parser = DetectParser(directoryPath);
        return parser?.Format;
    }

    private IDictionaryParser? DetectParser(string directoryPath)
    {
        // Try each parser in priority order (StarDict first as it's most common)
        foreach (var parser in _parsers)
        {
            if (parser.CanParse(directoryPath))
                return parser;
        }

        return null;
    }

    private static async Task ExtractToDirectoryAsync(
        Stream fileStream, string fileName, string targetDir, CancellationToken ct)
    {
        var lowerName = fileName.ToLowerInvariant();

        if (lowerName.EndsWith(".zip"))
        {
            await ExtractZipAsync(fileStream, targetDir, ct);
        }
        else if (lowerName.EndsWith(".tar.gz") || lowerName.EndsWith(".tgz"))
        {
            // For tar.gz, extract using GZip + tar
            await ExtractTarGzAsync(fileStream, targetDir, ct);
        }
        else
        {
            // Single file — just copy it to the temp directory
            var destPath = Path.Combine(targetDir, fileName);
            await using var destStream = File.Create(destPath);
            await fileStream.CopyToAsync(destStream, ct);
        }
    }

    private static async Task ExtractZipAsync(Stream stream, string targetDir, CancellationToken ct)
    {
        // Buffer the stream to allow seeking (ZipArchive requires it)
        using var memStream = new MemoryStream();
        await stream.CopyToAsync(memStream, ct);
        memStream.Position = 0;

        using var archive = new ZipArchive(memStream, ZipArchiveMode.Read);

        foreach (var entry in archive.Entries)
        {
            ct.ThrowIfCancellationRequested();

            // Skip directories
            if (string.IsNullOrEmpty(entry.Name))
                continue;

            // Security: prevent path traversal
            var destPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
            if (!destPath.StartsWith(Path.GetFullPath(targetDir), StringComparison.OrdinalIgnoreCase))
                continue;

            // Create subdirectory if needed
            var destDir = Path.GetDirectoryName(destPath);
            if (!string.IsNullOrEmpty(destDir))
                Directory.CreateDirectory(destDir);

            await using var entryStream = entry.Open();
            await using var destStream = File.Create(destPath);
            await entryStream.CopyToAsync(destStream, ct);
        }
    }

    private static async Task ExtractTarGzAsync(Stream stream, string targetDir, CancellationToken ct)
    {
        // Decompress gzip layer
        await using var gzStream = new GZipStream(stream, CompressionMode.Decompress);
        using var memStream = new MemoryStream();
        await gzStream.CopyToAsync(memStream, ct);
        memStream.Position = 0;

        // Simple TAR extraction (512-byte headers)
        await ExtractTarAsync(memStream, targetDir, ct);
    }

    private static async Task ExtractTarAsync(Stream tarStream, string targetDir, CancellationToken ct)
    {
        var headerBuffer = new byte[512];

        while (true)
        {
            ct.ThrowIfCancellationRequested();

            // Read 512-byte header
            var bytesRead = await ReadExactAsync(tarStream, headerBuffer, ct);
            if (bytesRead < 512) break;

            // Check for empty header (end of archive)
            if (headerBuffer.All(b => b == 0)) break;

            // Extract filename (bytes 0-99, null-terminated)
            var nameEnd = Array.IndexOf(headerBuffer, (byte)0, 0, 100);
            if (nameEnd < 0) nameEnd = 100;
            var name = System.Text.Encoding.UTF8.GetString(headerBuffer, 0, nameEnd).Trim();

            // Extract file size (bytes 124-135, octal string)
            var sizeStr = System.Text.Encoding.ASCII.GetString(headerBuffer, 124, 11).Trim('\0', ' ');
            var fileSize = string.IsNullOrEmpty(sizeStr) ? 0L : Convert.ToInt64(sizeStr, 8);

            // Type flag (byte 156): '0' or '\0' = regular file, '5' = directory
            var typeFlag = (char)headerBuffer[156];

            if ((typeFlag == '0' || typeFlag == '\0') && fileSize > 0 && !string.IsNullOrEmpty(name))
            {
                // Security: prevent path traversal
                var destPath = Path.GetFullPath(Path.Combine(targetDir, name));
                if (destPath.StartsWith(Path.GetFullPath(targetDir), StringComparison.OrdinalIgnoreCase))
                {
                    var destDir = Path.GetDirectoryName(destPath);
                    if (!string.IsNullOrEmpty(destDir))
                        Directory.CreateDirectory(destDir);

                    var fileData = new byte[fileSize];
                    await ReadExactAsync(tarStream, fileData, ct);
                    await File.WriteAllBytesAsync(destPath, fileData, ct);

                    // Skip padding to 512-byte boundary
                    var remainder = (int)(fileSize % 512);
                    if (remainder > 0)
                    {
                        var paddingSize = 512 - remainder;
                        var padding = new byte[paddingSize];
                        await ReadExactAsync(tarStream, padding, ct);
                    }
                }
                else
                {
                    // Skip the file data
                    await SkipBytesAsync(tarStream, fileSize, ct);
                }
            }
            else
            {
                // Skip file data (directories or other types)
                if (fileSize > 0)
                    await SkipBytesAsync(tarStream, fileSize, ct);
            }
        }
    }

    private static async Task<int> ReadExactAsync(Stream stream, byte[] buffer, CancellationToken ct)
    {
        int totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var read = await stream.ReadAsync(buffer.AsMemory(totalRead), ct);
            if (read == 0) break;
            totalRead += read;
        }
        return totalRead;
    }

    private static async Task SkipBytesAsync(Stream stream, long count, CancellationToken ct)
    {
        // Round up to 512-byte boundary
        var remainder = (int)(count % 512);
        var totalSkip = count + (remainder > 0 ? 512 - remainder : 0);

        var skipBuffer = new byte[Math.Min(4096, totalSkip)];
        long skipped = 0;
        while (skipped < totalSkip)
        {
            var toRead = (int)Math.Min(skipBuffer.Length, totalSkip - skipped);
            var read = await stream.ReadAsync(skipBuffer.AsMemory(0, toRead), ct);
            if (read == 0) break;
            skipped += read;
        }
    }
}
