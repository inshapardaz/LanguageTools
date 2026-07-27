namespace ScriptConverter.Mappings;

/// <summary>
/// Represents a single phoneme mapping across all three scripts.
/// </summary>
public sealed class CharacterMap
{
    /// <summary>The romanised representation(s). First entry is canonical.</summary>
    public required string[] Roman { get; init; }

    /// <summary>The Urdu Arabic script character(s).</summary>
    public required string Urdu { get; init; }

    /// <summary>The Hindi Devanagari character(s).</summary>
    public required string Hindi { get; init; }

    /// <summary>Whether this represents a vowel sound.</summary>
    public bool IsVowel { get; init; }

    /// <summary>Whether this is a vowel diacritic (zabar, zer, pesh / matra).</summary>
    public bool IsDiacritic { get; init; }

    /// <summary>Optional category for grouping (consonant, vowel, numeral, punctuation).</summary>
    public string Category { get; init; } = "consonant";
}
