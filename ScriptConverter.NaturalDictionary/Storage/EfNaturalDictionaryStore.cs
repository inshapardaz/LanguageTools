using Microsoft.EntityFrameworkCore;
using ScriptConverter.NaturalDictionary.Models;
using ScriptConverter.NaturalDictionary.Storage.Entities;

namespace ScriptConverter.NaturalDictionary.Storage;

/// <summary>
/// EF Core-backed implementation of INaturalDictionaryStore.
/// Uses SQLite for persistent storage with batch inserts for performance.
/// </summary>
public sealed class EfNaturalDictionaryStore : INaturalDictionaryStore
{
    private readonly IDbContextFactory<NaturalDictionaryDbContext> _contextFactory;

    public EfNaturalDictionaryStore(IDbContextFactory<NaturalDictionaryDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
        EnsureCreated();
    }

    public async Task CreateDictionaryAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var dictEntity = DictionaryInfoEntity.FromModel(info);
        db.Dictionaries.Add(dictEntity);

        // Batch insert articles in chunks for better performance with large dictionaries
        const int batchSize = 1000;
        for (int i = 0; i < articles.Count; i += batchSize)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var batch = articles.Skip(i).Take(batchSize)
                .Select(ArticleEntity.FromModel)
                .ToList();

            db.Articles.AddRange(batch);

            // Save each batch to avoid holding too many entities in memory
            if (i + batchSize < articles.Count)
            {
                await db.SaveChangesAsync(cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<NaturalDictionaryInfo>> GetAllDictionariesAsync(
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        return await db.Dictionaries
            .OrderByDescending(d => d.ImportedAt)
            .Select(d => d.ToModel())
            .ToListAsync(cancellationToken);
    }

    public async Task<NaturalDictionaryInfo?> GetDictionaryAsync(
        string dictionaryId,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var entity = await db.Dictionaries.FindAsync([dictionaryId], cancellationToken);
        return entity?.ToModel();
    }

    public async Task<bool> DeleteDictionaryAsync(
        string dictionaryId,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var entity = await db.Dictionaries.FindAsync([dictionaryId], cancellationToken);
        if (entity == null)
            return false;

        // Cascade delete will handle articles
        db.Dictionaries.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<LookupResult> LookupAsync(
        string headword,
        IEnumerable<string>? dictionaryIds = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var normalised = headword.ToLowerInvariant().Trim();
        var dictIdList = dictionaryIds?.ToList();

        var query = db.Articles
            .Include(a => a.Dictionary)
            .Where(a => a.HeadwordNormalised == normalised);

        if (dictIdList is { Count: > 0 })
        {
            query = query.Where(a => dictIdList.Contains(a.DictionaryId));
        }

        var matches = await query.ToListAsync(cancellationToken);

        var entries = matches.Select(a => new LookupEntry
        {
            DictionaryId = a.DictionaryId,
            DictionaryName = a.Dictionary?.Name ?? "Unknown",
            Definition = a.Definition,
        }).ToList();

        return new LookupResult
        {
            Headword = headword,
            Entries = entries,
        };
    }

    public async Task<IReadOnlyList<string>> SuggestAsync(
        string prefix,
        int limit = 20,
        IEnumerable<string>? dictionaryIds = null,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var normalisedPrefix = prefix.ToLowerInvariant().Trim();
        var dictIdList = dictionaryIds?.ToList();

        var query = db.Articles
            .Where(a => a.HeadwordNormalised.StartsWith(normalisedPrefix));

        if (dictIdList is { Count: > 0 })
        {
            query = query.Where(a => dictIdList.Contains(a.DictionaryId));
        }

        return await query
            .Select(a => a.Headword)
            .Distinct()
            .OrderBy(h => h)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task<BrowseResult> BrowseAsync(
        string dictionaryId,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var query = db.Articles.Where(a => a.DictionaryId == dictionaryId);

        var totalCount = await query.CountAsync(cancellationToken);

        var articles = await query
            .OrderBy(a => a.HeadwordNormalised)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => a.ToModel())
            .ToListAsync(cancellationToken);

        return new BrowseResult
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Articles = articles,
        };
    }

    public async Task<BrowseResult> SearchAsync(
        string dictionaryId,
        string query,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var normalised = query.ToLowerInvariant().Trim();

        var dbQuery = db.Articles
            .Where(a => a.DictionaryId == dictionaryId &&
                        a.HeadwordNormalised.Contains(normalised));

        var totalCount = await dbQuery.CountAsync(cancellationToken);

        var articles = await dbQuery
            .OrderBy(a => a.HeadwordNormalised)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => a.ToModel())
            .ToListAsync(cancellationToken);

        return new BrowseResult
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Articles = articles,
        };
    }

    private void EnsureCreated()
    {
        using var db = _contextFactory.CreateDbContext();
        db.Database.EnsureCreated();
    }
}
