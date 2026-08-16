using Microsoft.OpenApi;
using Nawishta;
using Nawishta.Dictionary;
using Nawishta.NaturalDictionary;
using Nawishta.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Configure dictionary store from appsettings.json
// Supported providers: "Json" (default), "Sqlite", "MySql"
// Set "Dictionary:Provider" and "Dictionary:ConnectionString" in appsettings.json
var dictionaryOptions = new DictionaryStoreFactory.DictionaryStoreOptions();
var dictSection = builder.Configuration.GetSection("Dictionary");
if (dictSection.Exists())
{
    var providerStr = dictSection["Provider"] ?? "Json";
    if (Enum.TryParse<DictionaryStoreProvider>(providerStr, true, out var provider))
        dictionaryOptions.Provider = provider;

    var connStr = dictSection["ConnectionString"];
    if (!string.IsNullOrWhiteSpace(connStr))
        dictionaryOptions.ConnectionString = connStr;

    var seedStr = dictSection["SeedIfEmpty"];
    if (bool.TryParse(seedStr, out var seed))
        dictionaryOptions.SeedIfEmpty = seed;
}

// Default JSON path if not overridden
if (dictionaryOptions.Provider == DictionaryStoreProvider.Json &&
    dictionaryOptions.ConnectionString == "Data/dictionary.json")
{
    var dataDir = Path.Combine(builder.Environment.ContentRootPath, "Data");
    Directory.CreateDirectory(dataDir);
    dictionaryOptions.ConnectionString = Path.Combine(dataDir, "dictionary.json");
}

builder.Services.AddDictionaryStore(dictionaryOptions);
builder.Services.AddSingleton(ScriptTransliterator.Instance);

// Configure natural dictionary (GoldenDict-compatible) support
var naturalDictDataDir = Path.Combine(builder.Environment.ContentRootPath, "Data");
Directory.CreateDirectory(naturalDictDataDir);
builder.Services.AddNaturalDictionary(options =>
{
    var natDictConnStr = builder.Configuration.GetSection("NaturalDictionary")?["ConnectionString"];
    options.ConnectionString = !string.IsNullOrWhiteSpace(natDictConnStr)
        ? natDictConnStr
        : $"Data Source={Path.Combine(naturalDictDataDir, "natural_dictionaries.db")}";
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Nawishta API", Version = "v1" });
});

builder.Services.AddHealthChecks();

Console.WriteLine($"Dictionary provider: {dictionaryOptions.Provider}");

var app = builder.Build();

// Log dictionary count after DI is built
var store = app.Services.GetRequiredService<IDictionaryStore>();
Console.WriteLine($"Dictionary loaded with {store.Count} entries.");

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Nawishta API v1");
});

app.UseCors();
app.UseStaticFiles();
app.UseRouting();

app.MapHealthChecks("/health");

app.MapConvertEndpoints();
app.MapDictionaryEndpoints();
app.MapNaturalDictionaryEndpoints();
app.MapSpellCheckEndpoints();

// Fallback to index.html for SPA routing (only for non-API paths)
app.MapFallback(async context =>
{
    if (!context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(
            Path.Combine(app.Environment.WebRootPath, "index.html"));
    }
    else
    {
        context.Response.StatusCode = 404;
        await context.Response.WriteAsJsonAsync(new { error = "Endpoint not found." });
    }
});

app.Run();
