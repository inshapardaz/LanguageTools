namespace ScriptConverter.NaturalDictionary.Models;

/// <summary>
/// A single article (headword + definition) in a natural-language dictionary.
/// </summary>
public sealed class NaturalDictionaryArticle
{
    /// <summary>Unique identifier for this article.</summary>
    public long Id { get; set; }

    /// <summary>ID of the dictionary this article belongs to.</summary>
    public required string DictionaryId { get; set; }

    /// <summary>The headword (lookup key).</summary>
    public required string Headword { get; set; }

    /// <summary>
    /// The definition/article body. May contain HTML or plain text depending on source format.
    /// </summary>
    public required string Definition { get; set; }

    /// <summary>
    /// Optional alternate headwords (synonyms, alternate spellings) serialised as JSON array.
    /// </summary>
    public string? Alternates { get; set; }
}
