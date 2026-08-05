namespace Nawishta.NaturalDictionary.Models;

/// <summary>
/// A single article in a natural-language dictionary.
/// Contains structured data: pronunciation, multiple senses (grouped by part of speech),
/// and word links (synonyms, antonyms, related/derived forms).
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
    /// Phonetic/pronunciation guide (e.g. IPA transcription).
    /// </summary>
    public string? Pronunciation { get; set; }

    /// <summary>
    /// The senses of the word, each grouped by grammatical type (noun, verb, etc.).
    /// A word can have multiple senses — one as a noun, another as a verb, etc.
    /// </summary>
    public List<WordSense> Senses { get; set; } = [];

    /// <summary>
    /// Links to related words: synonyms, antonyms, derived forms, root words, etc.
    /// </summary>
    public List<WordLink> Links { get; set; } = [];

    /// <summary>
    /// Raw definition text (HTML or plain text) from the original source.
    /// Kept for backwards compatibility and cases where structured parsing isn't possible.
    /// </summary>
    public string? RawDefinition { get; set; }

    /// <summary>
    /// Optional alternate headwords (alternate spellings) serialised as JSON array.
    /// </summary>
    public string? Alternates { get; set; }
}

/// <summary>
/// A single sense of a word, grouped by grammatical type.
/// For example, "run" as a verb has different meanings than "run" as a noun.
/// </summary>
public sealed class WordSense
{
    /// <summary>
    /// The grammatical type / part of speech for this sense group.
    /// E.g. "noun", "verb", "adjective", "adverb", "preposition", etc.
    /// </summary>
    public string? PartOfSpeech { get; set; }

    /// <summary>
    /// Optional grammatical information (gender, transitivity, declension, etc.).
    /// E.g. "masculine", "transitive", "countable".
    /// </summary>
    public string? Grammar { get; set; }

    /// <summary>
    /// The individual meanings within this sense group.
    /// A verb can have many different meanings.
    /// </summary>
    public List<Meaning> Meanings { get; set; } = [];
}

/// <summary>
/// A single meaning/definition within a sense.
/// </summary>
public sealed class Meaning
{
    /// <summary>The definition text for this meaning.</summary>
    public required string Definition { get; set; }

    /// <summary>Optional example sentences demonstrating this meaning.</summary>
    public List<string> Examples { get; set; } = [];

    /// <summary>Optional usage labels (formal, informal, archaic, regional, etc.).</summary>
    public string? Label { get; set; }
}

/// <summary>
/// A link from one word to another (synonym, antonym, root, derived form, etc.).
/// </summary>
public sealed class WordLink
{
    /// <summary>The type of relationship.</summary>
    public required WordLinkType LinkType { get; set; }

    /// <summary>The target word.</summary>
    public required string TargetWord { get; set; }

    /// <summary>Optional label or note about the link.</summary>
    public string? Note { get; set; }
}

/// <summary>
/// Types of relationships between words.
/// </summary>
public enum WordLinkType
{
    /// <summary>A word with the same or similar meaning.</summary>
    Synonym,

    /// <summary>A word with the opposite meaning.</summary>
    Antonym,

    /// <summary>The root word this word is derived from.</summary>
    Root,

    /// <summary>A word derived from this word.</summary>
    DerivedForm,

    /// <summary>A related word (general association).</summary>
    Related,

    /// <summary>A more specific term (hyponym).</summary>
    Narrower,

    /// <summary>A more general term (hypernym).</summary>
    Broader,

    /// <summary>See also / cross-reference.</summary>
    SeeAlso,
}
