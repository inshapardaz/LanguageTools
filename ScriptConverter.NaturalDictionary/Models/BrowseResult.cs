namespace ScriptConverter.NaturalDictionary.Models;

/// <summary>
/// Paginated result of browsing or searching dictionary articles.
/// </summary>
public sealed class BrowseResult
{
    /// <summary>Total number of matching articles.</summary>
    public int TotalCount { get; set; }

    /// <summary>Current page number (1-based).</summary>
    public int Page { get; set; }

    /// <summary>Page size.</summary>
    public int PageSize { get; set; }

    /// <summary>Total number of pages.</summary>
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;

    /// <summary>The articles for this page.</summary>
    public required IReadOnlyList<NaturalDictionaryArticle> Articles { get; set; }
}
