namespace ScriptConverter.Dictionary;

/// <summary>
/// Supported dictionary storage providers.
/// </summary>
public enum DictionaryStoreProvider
{
    /// <summary>JSON file storage (default, no database needed).</summary>
    Json,

    /// <summary>SQLite database storage.</summary>
    Sqlite,

    /// <summary>MySQL database storage.</summary>
    MySql,
}
