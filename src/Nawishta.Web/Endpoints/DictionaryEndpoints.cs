using Nawishta.Dictionary;
using Nawishta.Web.Contracts;

namespace Nawishta.Web.Endpoints;

public static class DictionaryEndpoints
{
    public static void MapDictionaryEndpoints(this IEndpointRouteBuilder app)
    {
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
    }
}
