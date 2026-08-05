namespace Nawishta.NaturalDictionary.Models;

/// <summary>
/// Metadata about an imported natural-language dictionary.
/// </summary>
public sealed class NaturalDictionaryInfo
{
    /// <summary>Unique identifier for this dictionary.</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..12];

    /// <summary>Display name of the dictionary.</summary>
    public required string Name { get; set; }

    /// <summary>Source format the dictionary was imported from.</summary>
    public DictionaryFormat Format { get; set; }

    /// <summary>Number of articles/entries in the dictionary.</summary>
    public int EntryCount { get; set; }

    /// <summary>Source language (if available from metadata).</summary>
    public string? SourceLanguage { get; set; }

    /// <summary>Target language (if available from metadata).</summary>
    public string? TargetLanguage { get; set; }

    /// <summary>Description or additional info from the dictionary metadata.</summary>
    public string? Description { get; set; }

    /// <summary>Original filename of the uploaded archive.</summary>
    public string? OriginalFileName { get; set; }

    /// <summary>When the dictionary was imported.</summary>
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
}
