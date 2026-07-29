using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Storage;

/// <summary>
/// Interface for natural dictionary storage operations.
/// </summary>
public interface INaturalDictionaryStore
{
    /// <summary>Create a new dictionary with all its articles.</summary>
    Task CreateDictionaryAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        CancellationToken cancellationToken = default);

    /// <summary>Get all available dictionaries.</summary>
    Task<IReadOnlyList<NaturalDictionaryInfo>> GetAllDictionariesAsync(CancellationToken cancellationToken = default);

    /// <summary>Get a specific dictionary by ID.</summary>
    Task<NaturalDictionaryInfo?> GetDictionaryAsync(string dictionaryId, CancellationToken cancellationToken = default);

    /// <summary>Delete a dictionary and all its articles.</summary>
    Task<bool> DeleteDictionaryAsync(string dictionaryId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Look up a headword across all dictionaries (or specific ones).
    /// Returns matching articles grouped by dictionary.
    /// </summary>
    Task<LookupResult> LookupAsync(
        string headword,
        IEnumerable<string>? dictionaryIds = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Search for headwords matching a prefix or partial string.
    /// </summary>
    Task<IReadOnlyList<string>> SuggestAsync(
        string prefix,
        int limit = 20,
        IEnumerable<string>? dictionaryIds = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Browse articles in a specific dictionary with pagination.
    /// Returns articles ordered alphabetically by headword.
    /// </summary>
    Task<BrowseResult> BrowseAsync(
        string dictionaryId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Search articles within a specific dictionary by headword substring.
    /// </summary>
    Task<BrowseResult> SearchAsync(
        string dictionaryId,
        string query,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);
}
