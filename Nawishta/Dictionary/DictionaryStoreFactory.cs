using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Nawishta.Dictionary;

/// <summary>
/// Factory for creating and configuring the appropriate IDictionaryStore 
/// based on configuration. Use this in your DI setup.
/// </summary>
public static class DictionaryStoreFactory
{
    /// <summary>
    /// Configuration for the dictionary store.
    /// </summary>
    public sealed class DictionaryStoreOptions
    {
        /// <summary>Which storage provider to use.</summary>
        public DictionaryStoreProvider Provider { get; set; } = DictionaryStoreProvider.Json;

        /// <summary>
        /// Connection string or file path depending on provider:
        /// - Json: path to the .json file (e.g. "Data/dictionary.json")
        /// - Sqlite: connection string (e.g. "Data Source=dictionary.db")
        /// - MySql: connection string (e.g. "Server=localhost;Database=scriptconverter;User=root;Password=pass;")
        /// </summary>
        public string ConnectionString { get; set; } = "Data/dictionary.json";

        /// <summary>Whether to seed the dictionary with default entries if empty.</summary>
        public bool SeedIfEmpty { get; set; } = true;
    }

    /// <summary>
    /// Registers the dictionary store in the DI container based on the provided options.
    /// Call this in your Program.cs or Startup.
    /// </summary>
    public static IServiceCollection AddDictionaryStore(
        this IServiceCollection services,
        DictionaryStoreOptions options)
    {
        switch (options.Provider)
        {
            case DictionaryStoreProvider.Json:
                services.AddSingleton<IDictionaryStore>(sp =>
                {
                    var store = new JsonDictionaryStore(options.ConnectionString);
                    if (options.SeedIfEmpty && store.Count == 0)
                    {
                        store.AddBulk(SeedDictionary.GetSeedEntries());
                    }
                    return store;
                });
                break;

            case DictionaryStoreProvider.Sqlite:
                services.AddDbContextFactory<DictionaryDbContext>(dbOptions =>
                {
                    dbOptions.UseSqlite(options.ConnectionString);
                });
                services.AddSingleton<IDictionaryStore>(sp =>
                {
                    var factory = sp.GetRequiredService<IDbContextFactory<DictionaryDbContext>>();
                    var store = new EfDictionaryStore(factory);
                    if (options.SeedIfEmpty && store.Count == 0)
                    {
                        store.AddBulk(SeedDictionary.GetSeedEntries());
                    }
                    return store;
                });
                break;

            case DictionaryStoreProvider.MySql:
                services.AddDbContextFactory<DictionaryDbContext>(dbOptions =>
                {
                    dbOptions.UseMySql(
                        options.ConnectionString,
                        ServerVersion.AutoDetect(options.ConnectionString));
                });
                services.AddSingleton<IDictionaryStore>(sp =>
                {
                    var factory = sp.GetRequiredService<IDbContextFactory<DictionaryDbContext>>();
                    var store = new EfDictionaryStore(factory);
                    if (options.SeedIfEmpty && store.Count == 0)
                    {
                        store.AddBulk(SeedDictionary.GetSeedEntries());
                    }
                    return store;
                });
                break;

            default:
                throw new ArgumentException($"Unknown dictionary store provider: {options.Provider}");
        }

        // Register DictionaryTransliterator using the store
        services.AddSingleton<DictionaryTransliterator>(sp =>
        {
            var store = sp.GetRequiredService<IDictionaryStore>();
            return new DictionaryTransliterator(store);
        });

        return services;
    }
}
