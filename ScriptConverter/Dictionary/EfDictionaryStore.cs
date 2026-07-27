using Microsoft.EntityFrameworkCore;

namespace ScriptConverter.Dictionary;

/// <summary>
/// Dictionary store backed by a relational database via Entity Framework Core.
/// Works with both SQLite and MySQL (or any EF Core provider).
/// </summary>
public sealed class EfDictionaryStore : IDictionaryStore
{
    private readonly IDbContextFactory<DictionaryDbContext> _contextFactory;

    public EfDictionaryStore(IDbContextFactory<DictionaryDbContext> contextFactory)
    {
        _contextFactory = contextFactory;
        EnsureCreated();
    }

    public int Count
    {
        get
        {
            using var db = _contextFactory.CreateDbContext();
            return db.DictionaryEntries.Count();
        }
    }

    public DictionaryEntry? Lookup(string roman)
    {
        if (string.IsNullOrWhiteSpace(roman))
            return null;

        var key = roman.Trim().ToLowerInvariant();
        using var db = _contextFactory.CreateDbContext();
        var entity = db.DictionaryEntries
            .FirstOrDefault(e => e.Roman == key);

        return entity?.ToDictionaryEntry();
    }

    public IReadOnlyList<DictionaryEntry> GetAll()
    {
        using var db = _contextFactory.CreateDbContext();
        return db.DictionaryEntries
            .OrderBy(e => e.Roman)
            .Select(e => e.ToDictionaryEntry())
            .ToList();
    }

    public IReadOnlyList<DictionaryEntry> Search(string query, int limit = 50)
    {
        if (string.IsNullOrWhiteSpace(query))
            return GetAll().Take(limit).ToList();

        var q = query.Trim().ToLowerInvariant();
        using var db = _contextFactory.CreateDbContext();
        return db.DictionaryEntries
            .Where(e => e.Roman.Contains(q) ||
                        (e.Meaning != null && e.Meaning.Contains(q)) ||
                        (e.Urdu != null && e.Urdu.Contains(q)) ||
                        (e.Hindi != null && e.Hindi.Contains(q)))
            .OrderBy(e => e.Roman)
            .Take(limit)
            .Select(e => e.ToDictionaryEntry())
            .ToList();
    }

    public DictionaryEntry Add(DictionaryEntry entry)
    {
        entry.Roman = entry.Roman.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(entry.Id))
            entry.Id = Guid.NewGuid().ToString("N")[..8];

        var entity = DictionaryEntryEntity.FromDictionaryEntry(entry);

        using var db = _contextFactory.CreateDbContext();
        db.DictionaryEntries.Add(entity);
        db.SaveChanges();

        return entity.ToDictionaryEntry();
    }

    public bool Update(DictionaryEntry entry)
    {
        if (string.IsNullOrWhiteSpace(entry.Id))
            return false;

        entry.Roman = entry.Roman.Trim().ToLowerInvariant();

        using var db = _contextFactory.CreateDbContext();
        var existing = db.DictionaryEntries.Find(entry.Id);
        if (existing == null)
            return false;

        existing.Roman = entry.Roman;
        existing.Urdu = entry.Urdu;
        existing.Hindi = entry.Hindi;
        existing.Meaning = entry.Meaning;
        existing.Category = entry.Category;

        db.SaveChanges();
        return true;
    }

    public bool Delete(string id)
    {
        using var db = _contextFactory.CreateDbContext();
        var entity = db.DictionaryEntries.Find(id);
        if (entity == null)
            return false;

        db.DictionaryEntries.Remove(entity);
        db.SaveChanges();
        return true;
    }

    public int AddBulk(IEnumerable<DictionaryEntry> entries)
    {
        using var db = _contextFactory.CreateDbContext();
        int count = 0;

        foreach (var entry in entries)
        {
            entry.Roman = entry.Roman.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(entry.Id))
                entry.Id = Guid.NewGuid().ToString("N")[..8];

            var entity = DictionaryEntryEntity.FromDictionaryEntry(entry);

            // Upsert: update if roman key exists, insert otherwise
            var existing = db.DictionaryEntries
                .FirstOrDefault(e => e.Roman == entity.Roman);

            if (existing != null)
            {
                existing.Urdu = entity.Urdu;
                existing.Hindi = entity.Hindi;
                existing.Meaning = entity.Meaning;
                existing.Category = entity.Category;
            }
            else
            {
                db.DictionaryEntries.Add(entity);
            }
            count++;
        }

        db.SaveChanges();
        return count;
    }

    private void EnsureCreated()
    {
        using var db = _contextFactory.CreateDbContext();
        db.Database.EnsureCreated();
    }
}
