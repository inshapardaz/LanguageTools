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

        var entities = await db.Dictionaries
            .OrderByDescending(d => d.ImportedAt)
            .ToListAsync(cancellationToken);

        return entities.Select(d => d.ToModel()).ToList();
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

        var entries = matches.Select(a =>
        {
            var model = a.ToModel();
            return new LookupEntry
            {
                DictionaryId = a.DictionaryId,
                DictionaryName = a.Dictionary?.Name ?? "Unknown",
                Pronunciation = model.Pronunciation,
                Senses = model.Senses,
                Links = model.Links,
                RawDefinition = model.RawDefinition,
            };
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

        var entities = await query
            .OrderBy(a => a.HeadwordNormalised)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new BrowseResult
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Articles = entities.Select(a => a.ToModel()).ToList(),
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

        var entities = await dbQuery
            .OrderBy(a => a.HeadwordNormalised)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new BrowseResult
        {
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            Articles = entities.Select(a => a.ToModel()).ToList(),
        };
    }

    private void EnsureCreated()
    {
        using var db = _contextFactory.CreateDbContext();
        db.Database.EnsureCreated();

        // Ensure the spell_check_replacements table exists (for existing DBs)
        db.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS spell_check_replacements (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                SourceWord TEXT NOT NULL,
                SourceWordNormalised TEXT NOT NULL,
                Replacement TEXT NOT NULL,
                Count INTEGER NOT NULL DEFAULT 1,
                LastUsedAt TEXT NOT NULL
            )");
        db.Database.ExecuteSqlRaw(@"
            CREATE INDEX IF NOT EXISTS IX_spellcheck_source_normalised
            ON spell_check_replacements (SourceWordNormalised)");
        db.Database.ExecuteSqlRaw(@"
            CREATE UNIQUE INDEX IF NOT EXISTS IX_spellcheck_source_replacement
            ON spell_check_replacements (SourceWordNormalised, Replacement)");
    }

    public async Task<NaturalDictionaryArticle?> GetArticleAsync(long articleId, CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);
        var entity = await db.Articles.FindAsync([articleId], cancellationToken);
        return entity?.ToModel();
    }

    public async Task<NaturalDictionaryArticle> AddArticleAsync(NaturalDictionaryArticle article, CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var entity = ArticleEntity.FromModel(article);
        db.Articles.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        // Update the dictionary entry count
        var dict = await db.Dictionaries.FindAsync([article.DictionaryId], cancellationToken);
        if (dict != null)
        {
            dict.EntryCount = await db.Articles.CountAsync(a => a.DictionaryId == article.DictionaryId, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        return entity.ToModel();
    }

    public async Task<bool> UpdateArticleAsync(NaturalDictionaryArticle article, CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var existing = await db.Articles.FindAsync([article.Id], cancellationToken);
        if (existing == null)
            return false;

        existing.Headword = article.Headword;
        existing.HeadwordNormalised = article.Headword.ToLowerInvariant().Trim();
        existing.Pronunciation = article.Pronunciation;
        existing.SensesJson = SerializeSenses(article.Senses);
        existing.LinksJson = SerializeLinks(article.Links);
        existing.RawDefinition = article.RawDefinition;
        existing.Alternates = article.Alternates;

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteArticleAsync(long articleId, CancellationToken cancellationToken = default)
    {
        await using var db = await _contextFactory.CreateDbContextAsync(cancellationToken);

        var entity = await db.Articles.FindAsync([articleId], cancellationToken);
        if (entity == null)
            return false;

        var dictionaryId = entity.DictionaryId;
        db.Articles.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);

        // Update the dictionary entry count
        var dict = await db.Dictionaries.FindAsync([dictionaryId], cancellationToken);
        if (dict != null)
        {
            dict.EntryCount = await db.Articles.CountAsync(a => a.DictionaryId == dictionaryId, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    private static string SerializeSenses(List<WordSense>? senses)
    {
        if (senses == null || senses.Count == 0)
            return "[]";
        return System.Text.Json.JsonSerializer.Serialize(senses, JsonOpts);
    }

    private static string? SerializeLinks(List<WordLink>? links)
    {
        if (links == null || links.Count == 0)
            return null;
        return System.Text.Json.JsonSerializer.Serialize(links, JsonOpts);
    }

    private static readonly System.Text.Json.JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };
}
