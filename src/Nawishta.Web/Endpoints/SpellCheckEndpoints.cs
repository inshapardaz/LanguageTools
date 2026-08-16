using Microsoft.EntityFrameworkCore;
using Nawishta.Dictionary;
using Nawishta.NaturalDictionary.Storage;
using Nawishta.NaturalDictionary.Storage.Entities;
using Nawishta.Web.Contracts;

namespace Nawishta.Web.Endpoints;

public static class SpellCheckEndpoints
{
    public static void MapSpellCheckEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/spellcheck/check", async (
            SpellCheckRequest request,
            INaturalDictionaryStore natStore,
            IDictionaryStore dictStore,
            IDbContextFactory<NaturalDictionaryDbContext> dbFactory,
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
            IDbContextFactory<NaturalDictionaryDbContext> dbFactory,
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
                db.SpellCheckReplacements.Add(new SpellCheckReplacementEntity
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
            IDbContextFactory<NaturalDictionaryDbContext> dbFactory,
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
    }

    private static bool IsUrduScript(string word) =>
        word.Any(c => c >= '\u0600' && c <= '\u06FF' || c >= '\u0750' && c <= '\u077F' ||
                      c >= '\uFB50' && c <= '\uFDFF' || c >= '\uFE70' && c <= '\uFEFF');

    private static bool IsHindiScript(string word) =>
        word.Any(c => c >= '\u0900' && c <= '\u097F' || c >= '\u0980' && c <= '\u09FF' ||
                      c >= '\uA8E0' && c <= '\uA8FF');
}
