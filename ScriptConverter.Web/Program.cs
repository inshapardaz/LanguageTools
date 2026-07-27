using ScriptConverter;
using ScriptConverter.Dictionary;
using ScriptConverter.Mappings;

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
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

Console.WriteLine($"Dictionary provider: {dictionaryOptions.Provider}");

var app = builder.Build();

// Log dictionary count after DI is built
var store = app.Services.GetRequiredService<IDictionaryStore>();
Console.WriteLine($"Dictionary loaded with {store.Count} entries.");

app.UseCors();
app.UseStaticFiles();
app.UseRouting();

// ===== Conversion API =====

app.MapPost("/api/convert", (ConvertRequest request,
    DictionaryTransliterator dictTransliterator,
    ScriptTransliterator ruleTransliterator) =>
{
    if (string.IsNullOrWhiteSpace(request.Text))
        return Results.BadRequest(new { error = "Text is required." });

    if (!Enum.TryParse<Script>(request.From, true, out var from))
        return Results.BadRequest(new { error = $"Invalid source script: '{request.From}'." });

    if (!Enum.TryParse<Script>(request.To, true, out var to))
        return Results.BadRequest(new { error = $"Invalid target script: '{request.To}'." });

    if (from == to)
        return Results.Ok(new ConvertResponse(request.Text, from.ToString(), to.ToString()));

    // Use dictionary-enhanced conversion for Roman input
    var result = dictTransliterator.ConvertWithPhrases(request.Text, from, to);
    return Results.Ok(new ConvertResponse(result, from.ToString(), to.ToString()));
});

// ===== Dictionary CRUD API =====

app.MapGet("/api/dictionary/stats", (IDictionaryStore store) =>
{
    var all = store.GetAll();
    var categories = all
        .Where(e => !string.IsNullOrEmpty(e.Category))
        .GroupBy(e => e.Category)
        .ToDictionary(g => g.Key!, g => g.Count());

    return Results.Ok(new
    {
        total = store.Count,
        withUrdu = all.Count(e => !string.IsNullOrEmpty(e.Urdu)),
        withHindi = all.Count(e => !string.IsNullOrEmpty(e.Hindi)),
        withMeaning = all.Count(e => !string.IsNullOrEmpty(e.Meaning)),
        categories
    });
});

app.MapGet("/api/dictionary", (string? q, int? limit, IDictionaryStore store) =>
{
    var entries = string.IsNullOrWhiteSpace(q)
        ? store.GetAll().Take(limit ?? 100).ToList()
        : store.Search(q, limit ?? 50);
    return Results.Ok(new { total = store.Count, entries });
});

app.MapGet("/api/dictionary/{id}", (string id, IDictionaryStore store) =>
{
    var entries = store.GetAll();
    var entry = entries.FirstOrDefault(e => e.Id == id);
    return entry != null ? Results.Ok(entry) : Results.NotFound();
});

app.MapPost("/api/dictionary", (DictionaryEntryRequest request, IDictionaryStore store) =>
{
    if (string.IsNullOrWhiteSpace(request.Roman))
        return Results.BadRequest(new { error = "Roman field is required." });

    var entry = new DictionaryEntry
    {
        Roman = request.Roman,
        Urdu = request.Urdu,
        Hindi = request.Hindi,
        Meaning = request.Meaning,
        Category = request.Category,
    };

    var created = store.Add(entry);
    return Results.Created($"/api/dictionary/{created.Id}", created);
});

app.MapPut("/api/dictionary/{id}", (string id, DictionaryEntryRequest request, IDictionaryStore store) =>
{
    if (string.IsNullOrWhiteSpace(request.Roman))
        return Results.BadRequest(new { error = "Roman field is required." });

    var entry = new DictionaryEntry
    {
        Id = id,
        Roman = request.Roman,
        Urdu = request.Urdu,
        Hindi = request.Hindi,
        Meaning = request.Meaning,
        Category = request.Category,
    };

    return store.Update(entry)
        ? Results.Ok(entry)
        : Results.NotFound(new { error = "Entry not found." });
});

app.MapDelete("/api/dictionary/{id}", (string id, IDictionaryStore store) =>
{
    return store.Delete(id)
        ? Results.NoContent()
        : Results.NotFound(new { error = "Entry not found." });
});

app.MapPost("/api/dictionary/bulk", (List<DictionaryEntryRequest> entries, IDictionaryStore store) =>
{
    var items = entries
        .Where(e => !string.IsNullOrWhiteSpace(e.Roman))
        .Select(e => new DictionaryEntry
        {
            Roman = e.Roman!,
            Urdu = e.Urdu,
            Hindi = e.Hindi,
            Meaning = e.Meaning,
            Category = e.Category,
        });

    var count = store.AddBulk(items);
    return Results.Ok(new { added = count, total = store.Count });
});

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

record ConvertRequest(string Text, string From, string To);
record ConvertResponse(string Result, string From, string To);
record DictionaryEntryRequest(string? Roman, string? Urdu, string? Hindi, string? Meaning, string? Category);
