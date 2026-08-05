namespace ScriptConverter.NaturalDictionary.Storage.Entities;

/// <summary>
/// Tracks spell-check word replacements — how many times a source word has been
/// replaced with a particular suggestion. Used to prioritize suggestions.
/// </summary>
public class SpellCheckReplacementEntity
{
    /// <summary>Auto-incremented primary key.</summary>
    public long Id { get; set; }

    /// <summary>The original misspelled word (stored as-is, case-preserved).</summary>
    public required string SourceWord { get; set; }

    /// <summary>Normalised source word for matching (lowercase/trimmed).</summary>
    public required string SourceWordNormalised { get; set; }

    /// <summary>The replacement word that was chosen.</summary>
    public required string Replacement { get; set; }

    /// <summary>Number of times this specific replacement was chosen.</summary>
    public int Count { get; set; } = 1;

    /// <summary>When this replacement was last used.</summary>
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;
}
