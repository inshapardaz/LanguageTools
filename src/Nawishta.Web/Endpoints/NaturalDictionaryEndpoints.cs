using Nawishta.NaturalDictionary.Export;
using Nawishta.NaturalDictionary.Models;
using Nawishta.NaturalDictionary.Services;
using Nawishta.NaturalDictionary.Storage;
using Nawishta.Web.Contracts;

namespace Nawishta.Web.Endpoints;

public static class NaturalDictionaryEndpoints
{
    public static void MapNaturalDictionaryEndpoints(this IEndpointRouteBuilder app)
    {
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
            var allArticles = new List<NaturalDictionaryArticle>();
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
            var articles = new List<NaturalDictionaryArticle>();
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

            var article = new NaturalDictionaryArticle
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
    }

    /// <summary>
    /// Strips trailing [N], (N), or numbered suffixes from a headword to find the base form.
    /// Examples: "run [1]" → "run", "bank (2)" → "bank", "set[3]" → "set"
    /// </summary>
    private static string NormalizeHeadwordForMerge(string headword)
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
