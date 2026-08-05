using ScriptConverter;
using ScriptConverter.Dictionary;
using ScriptConverter.Mappings;
using ScriptConverter.NaturalDictionary;
using ScriptConverter.NaturalDictionary.Export;
using ScriptConverter.NaturalDictionary.Services;
using ScriptConverter.NaturalDictionary.Storage;
using Microsoft.EntityFrameworkCore;

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
    ScriptTransliterator ruleTransliterator,
    IDictionaryStore dictStore) =>
{
    if (string.IsNullOrWhiteSpace(request.Text))
        return Results.BadRequest(new { error = "Text is required." });

    if (!Enum.TryParse<Script>(request.From, true, out var from))
        return Results.BadRequest(new { error = $"Invalid source script: '{request.From}'." });

    if (!Enum.TryParse<Script>(request.To, true, out var to))
        return Results.BadRequest(new { error = $"Invalid target script: '{request.To}'." });

    if (from == to)
        return Results.Ok(new { result = request.Text, from = from.ToString(), to = to.ToString() });

    // Use dictionary-enhanced conversion for Roman input
    var result = dictTransliterator.ConvertWithPhrases(request.Text, from, to);

    // If details are not requested, return simple response
    if (!request.Details)
        return Results.Ok(new { result, from = from.ToString(), to = to.ToString() });

    // Return word-by-word conversion details
    // Tokenize: split by whitespace (spaces, newlines, tabs, etc.)
    var tokens = request.Text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    var details = new List<object>();

    foreach (var token in tokens)
    {
        // Separate leading punctuation, core word, and trailing punctuation
        int start = 0;
        int end = token.Length;

        while (start < end && char.IsPunctuation(token[start]))
            start++;
        while (end > start && char.IsPunctuation(token[end - 1]))
            end--;

        var leadingPunct = token[..start];
        var trailingPunct = token[end..];
        var coreWord = token[start..end];

        // Add leading punctuation as its own token
        if (leadingPunct.Length > 0)
        {
            details.Add(new
            {
                input = leadingPunct,
                output = leadingPunct,
                source = "punctuation",
                dictionaryEntryId = (string?)null,
            });
        }

        // Process the core word
        if (coreWord.Length > 0)
        {
            var converted = dictTransliterator.ConvertWithPhrases(coreWord, from, to);

            // Look up existing dictionary entry regardless of direction
            ScriptConverter.Dictionary.DictionaryEntry? dictEntry = null;
            if (from == Script.Roman)
            {
                dictEntry = dictStore.Lookup(coreWord.Trim().ToLowerInvariant());
            }
            else
            {
                // For non-Roman sources, search by the converted Roman output or by script field
                var romanized = ruleTransliterator.Convert(coreWord, from, Script.Roman);
                if (!string.IsNullOrWhiteSpace(romanized))
                    dictEntry = dictStore.Lookup(romanized.Trim().ToLowerInvariant());
            }

            details.Add(new
            {
                input = coreWord,
                output = converted,
                source = dictEntry != null ? "dictionary" : "rules",
                dictionaryEntryId = dictEntry?.Id,
            });
        }
        else if (leadingPunct.Length == 0)
        {
            // Entire token is trailing punctuation only (shouldn't normally happen)
            details.Add(new
            {
                input = token,
                output = token,
                source = "punctuation",
                dictionaryEntryId = (string?)null,
            });
        }

        // Add trailing punctuation as its own token
        if (trailingPunct.Length > 0)
        {
            details.Add(new
            {
                input = trailingPunct,
                output = trailingPunct,
                source = "punctuation",
                dictionaryEntryId = (string?)null,
            });
        }
    }

    return Results.Ok(new
    {
        result,
        from = from.ToString(),
        to = to.ToString(),
        words = details,
    });
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
            a.Pronunciation,
            a.Senses,
            a.Links,
            a.RawDefinition,
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
            a.Pronunciation,
            a.Senses,
            a.Links,
            a.RawDefinition,
            a.Alternates,
        })
    });
});

// ===== Natural Dictionary Export =====

app.MapGet("/api/natural-dictionary/{id}/export", async (
    string id,
    string? format,
    DictionaryExportService exportService,
    CancellationToken ct) =>
{
    var exportFormat = (format?.ToLowerInvariant()) switch
    {
        "stardict" => ExportFormat.StarDict,
        "dsl" => ExportFormat.Dsl,
        "json" => ExportFormat.Json,
        "kobo" => ExportFormat.Kobo,
        "kindle" => ExportFormat.Kindle,
        _ => ExportFormat.StarDict,
    };

    var result = await exportService.ExportAsync(id, exportFormat, ct);
    if (result == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    return Results.File(result.Data, result.ContentType, result.FileName);
});

// ===== Natural Dictionary Merge Duplicates =====

app.MapGet("/api/natural-dictionary/{id}/merge-candidates", async (
    string id,
    int? limit,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var dict = await natStore.GetDictionaryAsync(id, ct);
    if (dict == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    // Load all articles (paginate)
    var allArticles = new List<ScriptConverter.NaturalDictionary.Models.NaturalDictionaryArticle>();
    int p = 1;
    while (true)
    {
        var batch = await natStore.BrowseAsync(id, p, 1000, ct);
        allArticles.AddRange(batch.Articles);
        if (p >= batch.TotalPages) break;
        p++;
    }

    // Group by base headword (strip trailing [N], (N), or numeric suffixes)
    var groups = allArticles
        .GroupBy(a => NormalizeHeadwordForMerge(a.Headword), StringComparer.OrdinalIgnoreCase)
        .Where(g => g.Count() > 1)
        .OrderByDescending(g => g.Count())
        .Take(limit ?? 100)
        .Select(g => new
        {
            baseHeadword = g.Key,
            count = g.Count(),
            articles = g.Select(a => new
            {
                a.Id,
                a.Headword,
                a.Pronunciation,
                sensesCount = a.Senses.Count,
                meaningsCount = a.Senses.Sum(s => s.Meanings.Count),
            }).ToList(),
        })
        .ToList();

    return Results.Ok(new { dictionaryId = id, totalGroups = groups.Count, groups });
});

app.MapPost("/api/natural-dictionary/{id}/merge", async (
    string id,
    MergeRequest request,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    if (request.ArticleIds == null || request.ArticleIds.Count < 2)
        return Results.BadRequest(new { error = "At least 2 article IDs are required to merge." });

    // Load all articles to merge
    var articles = new List<ScriptConverter.NaturalDictionary.Models.NaturalDictionaryArticle>();
    foreach (var articleId in request.ArticleIds)
    {
        var article = await natStore.GetArticleAsync(articleId, ct);
        if (article == null)
            return Results.BadRequest(new { error = $"Article {articleId} not found." });
        if (article.DictionaryId != id)
            return Results.BadRequest(new { error = $"Article {articleId} does not belong to this dictionary." });
        articles.Add(article);
    }

    // Determine merged headword (use provided or strip suffix from first)
    var mergedHeadword = !string.IsNullOrWhiteSpace(request.Headword)
        ? request.Headword.Trim()
        : NormalizeHeadwordForMerge(articles[0].Headword);

    // Merge: combine senses, links, pick first non-null pronunciation
    var mergedPronunciation = articles.Select(a => a.Pronunciation).FirstOrDefault(p => !string.IsNullOrWhiteSpace(p));
    var mergedSenses = articles.SelectMany(a => a.Senses).ToList();
    var mergedLinks = articles.SelectMany(a => a.Links)
        .GroupBy(l => (l.LinkType, l.TargetWord.ToLowerInvariant()))
        .Select(g => g.First())
        .ToList();
    var mergedRaw = string.Join("<hr>", articles
        .Where(a => !string.IsNullOrWhiteSpace(a.RawDefinition))
        .Select(a => a.RawDefinition));

    // Update the first article with merged content
    var primary = articles[0];
    primary.Headword = mergedHeadword;
    primary.Pronunciation = mergedPronunciation;
    primary.Senses = mergedSenses;
    primary.Links = mergedLinks;
    primary.RawDefinition = string.IsNullOrWhiteSpace(mergedRaw) ? null : mergedRaw;

    await natStore.UpdateArticleAsync(primary, ct);

    // Delete the other articles
    foreach (var other in articles.Skip(1))
    {
        await natStore.DeleteArticleAsync(other.Id, ct);
    }

    return Results.Ok(new
    {
        message = $"Merged {articles.Count} articles into \"{mergedHeadword}\".",
        article = new
        {
            primary.Id,
            primary.Headword,
            primary.Pronunciation,
            primary.Senses,
            primary.Links,
            primary.RawDefinition,
        }
    });
});

// ===== Natural Dictionary Article CRUD =====

app.MapGet("/api/natural-dictionary/articles/{articleId:long}", async (
    long articleId,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var article = await natStore.GetArticleAsync(articleId, ct);
    if (article == null)
        return Results.NotFound(new { error = "Article not found." });

    return Results.Ok(new
    {
        article.Id,
        article.DictionaryId,
        article.Headword,
        article.Pronunciation,
        article.Senses,
        article.Links,
        article.RawDefinition,
        article.Alternates,
    });
});

app.MapPost("/api/natural-dictionary/{dictId}/articles", async (
    string dictId,
    ArticleRequest request,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var dict = await natStore.GetDictionaryAsync(dictId, ct);
    if (dict == null)
        return Results.NotFound(new { error = "Dictionary not found." });

    if (string.IsNullOrWhiteSpace(request.Headword))
        return Results.BadRequest(new { error = "Headword is required." });

    var article = new ScriptConverter.NaturalDictionary.Models.NaturalDictionaryArticle
    {
        DictionaryId = dictId,
        Headword = request.Headword.Trim(),
        Pronunciation = request.Pronunciation,
        Senses = request.Senses ?? [],
        Links = request.Links ?? [],
        RawDefinition = request.RawDefinition,
        Alternates = request.Alternates,
    };

    var created = await natStore.AddArticleAsync(article, ct);
    return Results.Created($"/api/natural-dictionary/articles/{created.Id}", new
    {
        created.Id,
        created.DictionaryId,
        created.Headword,
        created.Pronunciation,
        created.Senses,
        created.Links,
        created.RawDefinition,
        created.Alternates,
    });
});

app.MapPut("/api/natural-dictionary/articles/{articleId:long}", async (
    long articleId,
    ArticleRequest request,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Headword))
        return Results.BadRequest(new { error = "Headword is required." });

    var existing = await natStore.GetArticleAsync(articleId, ct);
    if (existing == null)
        return Results.NotFound(new { error = "Article not found." });

    existing.Headword = request.Headword.Trim();
    existing.Pronunciation = request.Pronunciation;
    existing.Senses = request.Senses ?? [];
    existing.Links = request.Links ?? [];
    existing.RawDefinition = request.RawDefinition;
    existing.Alternates = request.Alternates;

    var updated = await natStore.UpdateArticleAsync(existing, ct);
    return updated
        ? Results.Ok(new
        {
            existing.Id,
            existing.DictionaryId,
            existing.Headword,
            existing.Pronunciation,
            existing.Senses,
            existing.Links,
            existing.RawDefinition,
            existing.Alternates,
        })
        : Results.StatusCode(500);
});

app.MapDelete("/api/natural-dictionary/articles/{articleId:long}", async (
    long articleId,
    INaturalDictionaryStore natStore,
    CancellationToken ct) =>
{
    var deleted = await natStore.DeleteArticleAsync(articleId, ct);
    return deleted
        ? Results.NoContent()
        : Results.NotFound(new { error = "Article not found." });
});

// ===== Spell Check API =====

app.MapPost("/api/spellcheck/check", async (
    SpellCheckRequest request,
    INaturalDictionaryStore natStore,
    IDictionaryStore dictStore,
    IDbContextFactory<ScriptConverter.NaturalDictionary.Storage.NaturalDictionaryDbContext> dbFactory,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Word))
        return Results.BadRequest(new { error = "Word is required." });

    var word = request.Word.Trim();

    // 1. Look up in the natural dictionary (authoritative source)
    var natResult = await natStore.LookupAsync(word, null, ct);

    if (natResult.Entries.Count > 0)
    {
        // Word found — return meaning/definition
        var firstEntry = natResult.Entries[0];
        var meaning = firstEntry.Senses.Count > 0
            ? string.Join("; ", firstEntry.Senses
                .SelectMany(s => s.Meanings)
                .Select(m => m.Definition)
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Take(3))
            : firstEntry.RawDefinition;

        return Results.Ok(new SpellCheckResponse
        {
            Found = true,
            Word = natResult.Headword,
            Meaning = meaning,
            Pronunciation = firstEntry.Pronunciation,
            Suggestions = null,
        });
    }

    // 2. Fall back to conversion dictionary
    var dictEntry = dictStore.Search(word, 1)
        .FirstOrDefault(e =>
            string.Equals(e.Roman, word, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(e.Urdu, word, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(e.Hindi, word, StringComparison.OrdinalIgnoreCase));

    if (dictEntry != null)
    {
        return Results.Ok(new SpellCheckResponse
        {
            Found = true,
            Word = word,
            Meaning = dictEntry.Meaning,
            Suggestions = null,
        });
    }

    // 3. Word not found — get suggestions ordered by replacement frequency
    var suggestions = new List<SpellCheckSuggestion>();

    // Get suggestions from the natural dictionary
    var natSuggestions = await natStore.SuggestAsync(word, 10, null, ct);
    foreach (var s in natSuggestions)
    {
        suggestions.Add(new SpellCheckSuggestion { Word = s, Priority = 0 });
    }

    // If no natural suggestions, try conversion dictionary
    if (suggestions.Count == 0)
    {
        var dictResults = dictStore.Search(word, 10);
        foreach (var e in dictResults)
        {
            // Return in the same script as the input
            var suggWord = IsUrduScript(word) ? e.Urdu :
                           IsHindiScript(word) ? e.Hindi : e.Roman;
            if (!string.IsNullOrWhiteSpace(suggWord))
            {
                suggestions.Add(new SpellCheckSuggestion { Word = suggWord, Priority = 0 });
            }
        }
    }

    // Boost suggestions by replacement frequency
    using var db = await dbFactory.CreateDbContextAsync(ct);
    var normWord = word.ToLowerInvariant();
    var replacements = db.SpellCheckReplacements
        .Where(r => r.SourceWordNormalised == normWord)
        .OrderByDescending(r => r.Count)
        .ToList();

    // Merge replacement history into suggestions
    var boostedSuggestions = new List<SpellCheckSuggestion>();

    // Add historical replacements at the top (sorted by count)
    foreach (var r in replacements)
    {
        boostedSuggestions.Add(new SpellCheckSuggestion { Word = r.Replacement, Priority = r.Count });
    }

    // Add remaining suggestions that aren't already in the boosted list
    var existingWords = new HashSet<string>(boostedSuggestions.Select(s => s.Word), StringComparer.OrdinalIgnoreCase);
    foreach (var s in suggestions)
    {
        if (!existingWords.Contains(s.Word))
        {
            boostedSuggestions.Add(s);
        }
    }

    return Results.Ok(new SpellCheckResponse
    {
        Found = false,
        Word = word,
        Meaning = null,
        Suggestions = boostedSuggestions.Take(8).ToList(),
    });
});

app.MapPost("/api/spellcheck/replace", async (
    SpellCheckReplaceRequest request,
    IDbContextFactory<ScriptConverter.NaturalDictionary.Storage.NaturalDictionaryDbContext> dbFactory,
    CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.SourceWord) || string.IsNullOrWhiteSpace(request.Replacement))
        return Results.BadRequest(new { error = "Both sourceWord and replacement are required." });

    var source = request.SourceWord.Trim();
    var replacement = request.Replacement.Trim();
    var normSource = source.ToLowerInvariant();

    using var db = await dbFactory.CreateDbContextAsync(ct);

    // Check if this source+replacement pair already exists
    var existing = db.SpellCheckReplacements
        .FirstOrDefault(r => r.SourceWordNormalised == normSource &&
                             r.Replacement == replacement);

    if (existing != null)
    {
        existing.Count++;
        existing.LastUsedAt = DateTime.UtcNow;
    }
    else
    {
        db.SpellCheckReplacements.Add(new ScriptConverter.NaturalDictionary.Storage.Entities.SpellCheckReplacementEntity
        {
            SourceWord = source,
            SourceWordNormalised = normSource,
            Replacement = replacement,
            Count = 1,
            LastUsedAt = DateTime.UtcNow,
        });
    }

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
});

app.MapPost("/api/spellcheck/check-batch", async (
    SpellCheckBatchRequest request,
    INaturalDictionaryStore natStore,
    IDictionaryStore dictStore,
    IDbContextFactory<ScriptConverter.NaturalDictionary.Storage.NaturalDictionaryDbContext> dbFactory,
    CancellationToken ct) =>
{
    if (request.Words == null || request.Words.Count == 0)
        return Results.BadRequest(new { error = "Words list is required." });

    // Limit batch size to prevent abuse
    var words = request.Words.Take(200).ToList();

    // Deduplicate (case-insensitive) but keep original casing for response
    var uniqueWords = words
        .GroupBy(w => w.ToLowerInvariant())
        .Select(g => g.First())
        .ToList();

    var results = new List<SpellCheckResponse>();

    // Batch lookup in natural dictionary
    foreach (var word in uniqueWords)
    {
        var trimmed = word.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            results.Add(new SpellCheckResponse { Found = true, Word = trimmed });
            continue;
        }

        // Check natural dictionary
        var natResult = await natStore.LookupAsync(trimmed, null, ct);

        if (natResult.Entries.Count > 0)
        {
            var firstEntry = natResult.Entries[0];
            var meaning = firstEntry.Senses.Count > 0
                ? string.Join("; ", firstEntry.Senses
                    .SelectMany(s => s.Meanings)
                    .Select(m => m.Definition)
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Take(3))
                : firstEntry.RawDefinition;

            results.Add(new SpellCheckResponse
            {
                Found = true,
                Word = natResult.Headword,
                Meaning = meaning,
                Pronunciation = firstEntry.Pronunciation,
            });
            continue;
        }

        // Fall back to conversion dictionary
        var dictEntry = dictStore.Search(trimmed, 1)
            .FirstOrDefault(e =>
                string.Equals(e.Roman, trimmed, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(e.Urdu, trimmed, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(e.Hindi, trimmed, StringComparison.OrdinalIgnoreCase));

        if (dictEntry != null)
        {
            results.Add(new SpellCheckResponse
            {
                Found = true,
                Word = trimmed,
                Meaning = dictEntry.Meaning,
            });
            continue;
        }

        // Word not found — get suggestions
        var suggestions = new List<SpellCheckSuggestion>();

        var natSuggestions = await natStore.SuggestAsync(trimmed, 5, null, ct);
        foreach (var s in natSuggestions)
        {
            suggestions.Add(new SpellCheckSuggestion { Word = s, Priority = 0 });
        }

        if (suggestions.Count == 0)
        {
            var dictResults = dictStore.Search(trimmed, 5);
            foreach (var e in dictResults)
            {
                var suggWord = IsUrduScript(trimmed) ? e.Urdu :
                               IsHindiScript(trimmed) ? e.Hindi : e.Roman;
                if (!string.IsNullOrWhiteSpace(suggWord))
                {
                    suggestions.Add(new SpellCheckSuggestion { Word = suggWord, Priority = 0 });
                }
            }
        }

        results.Add(new SpellCheckResponse
        {
            Found = false,
            Word = trimmed,
            Suggestions = suggestions.Take(5).ToList(),
        });
    }

    // Boost suggestions by replacement frequency (batch query)
    using var db = await dbFactory.CreateDbContextAsync(ct);
    var notFoundWords = results.Where(r => !r.Found).Select(r => r.Word.ToLowerInvariant()).ToList();

    if (notFoundWords.Count > 0)
    {
        var allReplacements = db.SpellCheckReplacements
            .Where(r => notFoundWords.Contains(r.SourceWordNormalised))
            .OrderByDescending(r => r.Count)
            .ToList();

        foreach (var result in results.Where(r => !r.Found))
        {
            var norm = result.Word.ToLowerInvariant();
            var wordReplacements = allReplacements
                .Where(r => r.SourceWordNormalised == norm)
                .ToList();

            if (wordReplacements.Count > 0 && result.Suggestions != null)
            {
                var boosted = new List<SpellCheckSuggestion>();
                var existingWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                // Add historical replacements first
                foreach (var r in wordReplacements)
                {
                    boosted.Add(new SpellCheckSuggestion { Word = r.Replacement, Priority = r.Count });
                    existingWords.Add(r.Replacement);
                }

                // Add remaining suggestions
                foreach (var s in result.Suggestions)
                {
                    if (!existingWords.Contains(s.Word))
                    {
                        boosted.Add(s);
                    }
                }

                result.Suggestions = boosted.Take(8).ToList();
            }
        }
    }

    return Results.Ok(new { results });
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

record ConvertRequest(string Text, string From, string To, bool Details = false);
record ConvertResponse(string Result, string From, string To);
record DictionaryEntryRequest(string? Roman, string? Urdu, string? Hindi, string? Meaning, string? Category);

record ArticleRequest(
    string? Headword,
    string? Pronunciation,
    List<ScriptConverter.NaturalDictionary.Models.WordSense>? Senses,
    List<ScriptConverter.NaturalDictionary.Models.WordLink>? Links,
    string? RawDefinition,
    string? Alternates);

record MergeRequest(List<long>? ArticleIds, string? Headword);

record SpellCheckRequest(string? Word);
record SpellCheckBatchRequest(List<string>? Words);
record SpellCheckReplaceRequest(string? SourceWord, string? Replacement);

class SpellCheckSuggestion
{
    public required string Word { get; set; }
    public int Priority { get; set; }
}

class SpellCheckResponse
{
    public bool Found { get; set; }
    public required string Word { get; set; }
    public string? Meaning { get; set; }
    public string? Pronunciation { get; set; }
    public List<SpellCheckSuggestion>? Suggestions { get; set; }
}

partial class Program
{
    static bool IsUrduScript(string word) =>
        word.Any(c => c >= '\u0600' && c <= '\u06FF' || c >= '\u0750' && c <= '\u077F' ||
                      c >= '\uFB50' && c <= '\uFDFF' || c >= '\uFE70' && c <= '\uFEFF');

    static bool IsHindiScript(string word) =>
        word.Any(c => c >= '\u0900' && c <= '\u097F' || c >= '\u0980' && c <= '\u09FF' ||
                      c >= '\uA8E0' && c <= '\uA8FF');

    /// <summary>
    /// Strips trailing [N], (N), or numbered suffixes from a headword to find the base form.
    /// Examples: "run [1]" → "run", "bank (2)" → "bank", "set[3]" → "set"
    /// </summary>
    static string NormalizeHeadwordForMerge(string headword)
    {
        if (string.IsNullOrWhiteSpace(headword))
            return headword;

        // Strip patterns like: " [1]", "[2]", " (1)", "(3)", " 1", " 2" at end
        var trimmed = System.Text.RegularExpressions.Regex.Replace(
            headword.Trim(),
            @"\s*[\[\(]?\d+[\]\)]?\s*$",
            "");

        return trimmed.Trim();
    }
}
