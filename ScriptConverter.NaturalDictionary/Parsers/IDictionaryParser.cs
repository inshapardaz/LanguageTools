using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Parsers;

/// <summary>
/// Interface for dictionary format parsers.
/// Each parser handles a specific GoldenDict-compatible format.
/// </summary>
public interface IDictionaryParser
{
    /// <summary>The format this parser handles.</summary>
    DictionaryFormat Format { get; }

    /// <summary>
    /// Check if the given directory contains files this parser can handle.
    /// </summary>
    /// <param name="directoryPath">Path to the extracted dictionary files.</param>
    bool CanParse(string directoryPath);

    /// <summary>
    /// Parse a dictionary from the given directory.
    /// </summary>
    /// <param name="directoryPath">Path to the extracted dictionary files.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Parsed dictionary info and articles.</returns>
    Task<ParsedDictionary> ParseAsync(string directoryPath, CancellationToken cancellationToken = default);
}

/// <summary>
/// Result of parsing a dictionary source.
/// </summary>
public sealed class ParsedDictionary
{
    /// <summary>Metadata about the dictionary.</summary>
    public required NaturalDictionaryInfo Info { get; set; }

    /// <summary>All parsed articles.</summary>
    public required IReadOnlyList<NaturalDictionaryArticle> Articles { get; set; }
}
