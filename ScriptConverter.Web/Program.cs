using ScriptConverter;
using ScriptConverter.Dictionary;
using ScriptConverter.Mappings;
using ScriptConverter.NaturalDictionary;
using ScriptConverter.NaturalDictionary.Services;
using ScriptConverter.NaturalDictionary.Storage;

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

// ===== Natural Dictionary API (GoldenDict-compatible) =====

app.MapPost("/api/natural-dictionary/upload", async (
    HttpRequest request,
    DictionaryImportService importService,
    CancellationToken ct) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { error = "Multipart form data required." });

    var form = await request.ReadFormAsync(ct);
    var file = form.Files.GetFile("file");

    if (file == null || file.Length == 0)
        return Results.BadRequest(new { error = "A dictionary file is required. Upload a zip, tar.gz, or raw dictionary file." });

    // Validate file size (max 500MB)
    if (file.Length > 500 * 1024 * 1024)
        return Results.BadRequest(new { error = "File too large. Maximum size is 500MB." });

    try
    {
        await using var stream = file.OpenReadStream();
        var info = await importService.ImportAsync(stream, file.FileName, ct);

        return Results.Ok(new
        {
            message = "Dictionary imported successfully.",
            dictionary = new
            {
                info.Id,
                info.Name,
                format = info.Format.ToString(),
                info.EntryCount,
                info.SourceLanguage,
                info.TargetLanguage,
                info.Description,
                info.ImportedAt,
            }
        });
    }
    catch (InvalidOperationException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
})
.DisableAntiforgery();

app.MapGet("/api/natural-dictionary", async (INaturalDictionaryStore natStore, CancellationToken ct) =>
{
    var dictionaries = await natStore.GetAllDictionariesAsync(ct);
    return Results.Ok(new
    {
        total = dictionaries.Count,
        dictionaries = dictionaries.Select(d => new
        {
            d.Id,
            d.Name,
            format = d.Format.ToString(),
            d.EntryCount,
            d.SourceLanguage,
            d.TargetLanguage,
            d.Description,
            d.OriginalFileName,
            d.ImportedAt,
        })
    });
});

app.MapGet("/api/natural-dictionary/{id}", async (
    string id,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var dict = await natStore.GetDictionaryAsync(id, ct);
    if (dict == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    return Results.Ok(new
    {
        dict.Id,
        dict.Name,
        format = dict.Format.ToString(),
        dict.EntryCount,
        dict.SourceLanguage,
        dict.TargetLanguage,
        dict.Description,
        dict.OriginalFileName,
        dict.ImportedAt,
    });
});

app.MapDelete("/api/natural-dictionary/{id}", async (
    string id,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var deleted = await natStore.DeleteDictionaryAsync(id, ct);
    return deleted
        ? Results.NoContent()
        : Results.NotFound(new { error = "Dictionary not found." });
});

app.MapGet("/api/natural-dictionary/lookup", async (
    string word,
    string? dicts,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(word))
        return Results.BadRequest(new { error = "Query parameter 'word' is required." });

    var dictIds = string.IsNullOrWhiteSpace(dicts)
        ? null
        : dicts.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    var result = await natStore.LookupAsync(word, dictIds, ct);
    return Results.Ok(result);
});

app.MapGet("/api/natural-dictionary/suggest", async (
    string prefix,
    int? limit,
    string? dicts,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(prefix))
        return Results.BadRequest(new { error = "Query parameter 'prefix' is required." });

    var dictIds = string.IsNullOrWhiteSpace(dicts)
        ? null
        : dicts.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    var suggestions = await natStore.SuggestAsync(prefix, limit ?? 20, dictIds, ct);
    return Results.Ok(new { suggestions });
});

app.MapGet("/api/natural-dictionary/{id}/browse", async (
    string id,
    int? page,
    int? pageSize,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var dict = await natStore.GetDictionaryAsync(id, ct);
    if (dict == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    var result = await natStore.BrowseAsync(id, page ?? 1, pageSize ?? 50, ct);
    return Results.Ok(new
    {
        dictionaryId = id,
        dictionaryName = dict.Name,
        result.TotalCount,
        result.Page,
        result.PageSize,
        result.TotalPages,
        articles = result.Articles.Select(a => new
        {
            a.Id,
            a.Headword,
            a.Definition,
            a.Alternates,
        })
    });
});

app.MapGet("/api/natural-dictionary/{id}/search", async (
    string id,
    string q,
    int? page,
    int? pageSize,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(q))
        return Results.BadRequest(new { error = "Query parameter 'q' is required." });

    var dict = await natStore.GetDictionaryAsync(id, ct);
    if (dict == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    var result = await natStore.SearchAsync(id, q, page ?? 1, pageSize ?? 50, ct);
    return Results.Ok(new
    {
        dictionaryId = id,
        dictionaryName = dict.Name,
        query = q,
        result.TotalCount,
        result.Page,
        result.PageSize,
        result.TotalPages,
        articles = result.Articles.Select(a => new
        {
            a.Id,
            a.Headword,
            a.Definition,
            a.Alternates,
        })
    });
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
