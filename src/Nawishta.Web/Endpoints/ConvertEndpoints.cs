using Nawishta.Dictionary;
using Nawishta.Mappings;
using Nawishta.Web.Contracts;

namespace Nawishta.Web.Endpoints;

public static class ConvertEndpoints
{
    public static void MapConvertEndpoints(this IEndpointRouteBuilder app)
    {
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
                    DictionaryEntry? dictEntry = null;
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
    }
}
