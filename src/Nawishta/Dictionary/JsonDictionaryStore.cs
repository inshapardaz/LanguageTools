using System.Collections.Concurrent;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Unicode;

namespace Nawishta.Dictionary;

/// <summary>
/// JSON file-backed dictionary store. Thread-safe for concurrent access.
/// Loads the dictionary into memory for fast lookups and persists changes to disk.
/// </summary>
public sealed class JsonDictionaryStore : IDictionaryStore
{
    private readonly string _filePath;
    private readonly ConcurrentDictionary<string, DictionaryEntry> _byRoman;
    private readonly ConcurrentDictionary<string, DictionaryEntry> _byId;
    private readonly object _saveLock = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.Create(UnicodeRanges.All),
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    public JsonDictionaryStore(string filePath)
    {
        _filePath = filePath;
        _byRoman = new ConcurrentDictionary<string, DictionaryEntry>(StringComparer.OrdinalIgnoreCase);
        _byId = new ConcurrentDictionary<string, DictionaryEntry>(StringComparer.OrdinalIgnoreCase);

        Load();
    }

    public int Count => _byId.Count;

    public DictionaryEntry? Lookup(string roman)
    {
        if (string.IsNullOrWhiteSpace(roman))
            return null;

        _byRoman.TryGetValue(roman.Trim().ToLowerInvariant(), out var entry);
        return entry;
    }

    public IReadOnlyList<DictionaryEntry> GetAll()
    {
        return _byId.Values.OrderBy(e => e.Roman).ToList();
    }

    public IReadOnlyList<DictionaryEntry> Search(string query, int limit = 50)
    {
        if (string.IsNullOrWhiteSpace(query))
            return GetAll().Take(limit).ToList();

        var q = query.Trim().ToLowerInvariant();
        return _byId.Values
            .Where(e => e.Roman.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                        (e.Meaning?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                        (e.Urdu?.Contains(q) ?? false) ||
                        (e.Hindi?.Contains(q) ?? false))
            .OrderBy(e => e.Roman)
            .Take(limit)
            .ToList();
    }

    public DictionaryEntry Add(DictionaryEntry entry)
    {
        NormaliseEntry(entry);

        if (string.IsNullOrWhiteSpace(entry.Id))
            entry.Id = Guid.NewGuid().ToString("N")[..8];

        _byRoman[entry.Roman] = entry;
        _byId[entry.Id] = entry;
        Save();
        return entry;
    }

    public bool Update(DictionaryEntry entry)
    {
        if (string.IsNullOrWhiteSpace(entry.Id) || !_byId.ContainsKey(entry.Id))
            return false;

        NormaliseEntry(entry);

        // Remove old roman key if it changed
        if (_byId.TryGetValue(entry.Id, out var existing) && existing.Roman != entry.Roman)
        {
            _byRoman.TryRemove(existing.Roman, out _);
        }

        _byRoman[entry.Roman] = entry;
        _byId[entry.Id] = entry;
        Save();
        return true;
    }

    public bool Delete(string id)
    {
        if (!_byId.TryRemove(id, out var entry))
            return false;

        _byRoman.TryRemove(entry.Roman, out _);
        Save();
        return true;
    }

    public int AddBulk(IEnumerable<DictionaryEntry> entries)
    {
        int count = 0;
        foreach (var entry in entries)
        {
            NormaliseEntry(entry);
            if (string.IsNullOrWhiteSpace(entry.Id))
                entry.Id = Guid.NewGuid().ToString("N")[..8];

            _byRoman[entry.Roman] = entry;
            _byId[entry.Id] = entry;
            count++;
        }
        Save();
        return count;
    }

    private static void NormaliseEntry(DictionaryEntry entry)
    {
        entry.Roman = entry.Roman.Trim().ToLowerInvariant();
    }

    private void Load()
    {
        if (!File.Exists(_filePath))
            return;

        try
        {
            var json = File.ReadAllText(_filePath);
            var entries = JsonSerializer.Deserialize<List<DictionaryEntry>>(json, JsonOptions);
            if (entries == null) return;

            foreach (var entry in entries)
            {
                if (string.IsNullOrWhiteSpace(entry.Roman)) continue;
                NormaliseEntry(entry);
                if (string.IsNullOrWhiteSpace(entry.Id))
                    entry.Id = Guid.NewGuid().ToString("N")[..8];

                _byRoman[entry.Roman] = entry;
                _byId[entry.Id] = entry;
            }
        }
        catch (JsonException)
        {
            // Corrupted file — start fresh
        }
    }

    private void Save()
    {
        lock (_saveLock)
        {
            var entries = _byId.Values.OrderBy(e => e.Roman).ToList();
            var json = JsonSerializer.Serialize(entries, JsonOptions);

            var dir = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            File.WriteAllText(_filePath, json);
        }
    }
}
