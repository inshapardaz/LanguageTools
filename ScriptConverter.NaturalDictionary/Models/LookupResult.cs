namespace ScriptConverter.NaturalDictionary.Models;

/// <summary>
/// Result of looking up a word across one or more dictionaries.
/// </summary>
public sealed class LookupResult
{
    /// <summary>The queried headword.</summary>
    public required string Headword { get; set; }

    /// <summary>Results from each dictionary that matched.</summary>
    public required List<LookupEntry> Entries { get; set; } = [];
}

/// <summary>
/// A single article result from a specific dictionary.
/// </summary>
public sealed class LookupEntry
{
    /// <summary>Which dictionary this came from.</summary>
    public required string DictionaryId { get; set; }

    /// <summary>Display name of the dictionary.</summary>
    public required string DictionaryName { get; set; }

    /// <summary>Phonetic/pronunciation guide.</summary>
    public string? Pronunciation { get; set; }

    /// <summary>Structured senses (grouped by part of speech).</summary>
    public List<WordSense> Senses { get; set; } = [];

    /// <summary>Word links (synonyms, antonyms, related words).</summary>
    public List<WordLink> Links { get; set; } = [];

    /// <summary>Raw definition (HTML fallback) when structured data isn't available.</summary>
    public string? RawDefinition { get; set; }
}
