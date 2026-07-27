namespace ScriptConverter.Dictionary;

/// <summary>
/// Interface for dictionary storage operations.
/// </summary>
public interface IDictionaryStore
{
    /// <summary>Look up a word by its romanised form (case-insensitive).</summary>
    DictionaryEntry? Lookup(string roman);

    /// <summary>Get all entries in the dictionary.</summary>
    IReadOnlyList<DictionaryEntry> GetAll();

    /// <summary>Search entries by partial roman match.</summary>
    IReadOnlyList<DictionaryEntry> Search(string query, int limit = 50);

    /// <summary>Add a new entry. Returns the entry with assigned ID.</summary>
    DictionaryEntry Add(DictionaryEntry entry);

    /// <summary>Update an existing entry by ID.</summary>
    bool Update(DictionaryEntry entry);

    /// <summary>Delete an entry by ID.</summary>
    bool Delete(string id);

    /// <summary>Add multiple entries at once (for bulk import).</summary>
    int AddBulk(IEnumerable<DictionaryEntry> entries);

    /// <summary>Get total count of entries.</summary>
    int Count { get; }
}
