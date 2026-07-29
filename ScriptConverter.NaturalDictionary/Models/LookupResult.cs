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
/// A single definition from a specific dictionary.
/// </summary>
public sealed class LookupEntry
{
    /// <summary>Which dictionary this came from.</summary>
    public required string DictionaryId { get; set; }

    /// <summary>Display name of the dictionary.</summary>
    public required string DictionaryName { get; set; }

    /// <summary>The definition text (may contain HTML).</summary>
    public required string Definition { get; set; }
}
