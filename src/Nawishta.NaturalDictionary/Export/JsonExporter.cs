using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;
using Nawishta.NaturalDictionary.Models;

namespace Nawishta.NaturalDictionary.Export;

/// <summary>
/// Exports a dictionary as a structured JSON file.
/// Useful for backup, migration, or integration with other tools.
/// </summary>
public sealed class JsonExporter : IDictionaryExporter
{
    public DictionaryFormat Format => DictionaryFormat.Unknown; // JSON isn't a GoldenDict format
    public string FileExtension => ".json";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    public Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default)
    {
        Directory.CreateDirectory(outputDirectory);

        var safeName = SanitizeFileName(info.Name);
        var jsonPath = Path.Combine(outputDirectory, safeName + ".json");

        var export = new
        {
            info.Name,
            format = info.Format.ToString(),
            info.EntryCount,
            info.SourceLanguage,
            info.TargetLanguage,
            info.Description,
            exportedAt = DateTime.UtcNow,
            articles = articles.Select(a => new
            {
                a.Headword,
                a.Pronunciation,
                a.Senses,
                a.Links,
                a.Alternates,
            }).ToList(),
        };

        var json = JsonSerializer.Serialize(export, JsonOpts);
        File.WriteAllText(jsonPath, json, Encoding.UTF8);

        var files = new List<string> { jsonPath };
        return Task.FromResult<IReadOnlyList<string>>(files);
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(name.Select(c => invalid.Contains(c) ? '_' : c).ToArray());
        return sanitized.Length > 50 ? sanitized[..50] : sanitized;
    }
}
