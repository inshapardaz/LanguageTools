using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ScriptConverter.NaturalDictionary.Parsers;
using ScriptConverter.NaturalDictionary.Services;
using ScriptConverter.NaturalDictionary.Storage;

namespace ScriptConverter.NaturalDictionary;

/// <summary>
/// Extension methods for registering NaturalDictionary services in the DI container.
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Configuration options for the NaturalDictionary service.
    /// </summary>
    public sealed class NaturalDictionaryOptions
    {
        /// <summary>
        /// SQLite connection string for dictionary storage.
        /// Defaults to a file named "natural_dictionaries.db" in the app's data directory.
        /// </summary>
        public string ConnectionString { get; set; } = "Data Source=natural_dictionaries.db";
    }

    /// <summary>
    /// Registers all NaturalDictionary services: parsers, storage, and import service.
    /// </summary>
    public static IServiceCollection AddNaturalDictionary(
        this IServiceCollection services,
        Action<NaturalDictionaryOptions>? configure = null)
    {
        var options = new NaturalDictionaryOptions();
        configure?.Invoke(options);

        // Register EF Core DbContext for natural dictionaries
        services.AddDbContextFactory<NaturalDictionaryDbContext>(dbOptions =>
        {
            dbOptions.UseSqlite(options.ConnectionString);
        });

        // Register storage
        services.AddSingleton<INaturalDictionaryStore, EfNaturalDictionaryStore>();

        // Register parsers
        services.AddSingleton<IDictionaryParser, StarDictParser>();
        services.AddSingleton<IDictionaryParser, DslParser>();

        // Register import service
        services.AddSingleton<DictionaryImportService>();

        return services;
    }
}
