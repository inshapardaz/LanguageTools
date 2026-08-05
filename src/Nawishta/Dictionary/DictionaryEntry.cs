namespace Nawishta.Dictionary;

/// <summary>
/// Represents a single word entry in the transliteration dictionary.
/// Maps a romanised form to its correct Urdu and/or Hindi script representation.
/// </summary>
public sealed class DictionaryEntry
{
    /// <summary>Unique identifier for this entry.</summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];

    /// <summary>The romanised form (lowercase, normalised). This is the lookup key.</summary>
    public required string Roman { get; set; }

    /// <summary>The correct Urdu Arabic script representation.</summary>
    public string? Urdu { get; set; }

    /// <summary>The correct Hindi Devanagari script representation.</summary>
    public string? Hindi { get; set; }

    /// <summary>Optional English meaning for reference.</summary>
    public string? Meaning { get; set; }

    /// <summary>Optional category (noun, verb, adjective, greeting, etc.).</summary>
    public string? Category { get; set; }
}
