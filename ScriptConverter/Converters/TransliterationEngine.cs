using System.Text;

namespace ScriptConverter.Converters;

/// <summary>
/// Core transliteration engine that performs longest-match replacement
/// using ordered lookup tables. This handles the fundamental algorithm
/// shared by all converters.
/// </summary>
public static class TransliterationEngine
{
    /// <summary>
    /// Performs transliteration using a longest-match-first approach.
    /// Iterates through the input and at each position tries all entries
    /// in order, picking the first (longest) match.
    /// </summary>
    /// <param name="input">Source text to transliterate.</param>
    /// <param name="entries">Ordered lookup entries (source → target). Should be sorted longest-source-first.</param>
    /// <returns>The transliterated result.</returns>
    public static string Transliterate(string input, (string Source, string Target)[] entries)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        var result = new StringBuilder(input.Length * 2);
        int i = 0;

        while (i < input.Length)
        {
            bool matched = false;

            foreach (var (source, target) in entries)
            {
                if (source.Length == 0)
                    continue;

                if (i + source.Length <= input.Length &&
                    input.AsSpan(i, source.Length).SequenceEqual(source.AsSpan()))
                {
                    result.Append(target);
                    i += source.Length;
                    matched = true;
                    break;
                }
            }

            if (!matched)
            {
                // Pass through characters that don't match any entry
                result.Append(input[i]);
                i++;
            }
        }

        return result.ToString();
    }

    /// <summary>
    /// Performs case-insensitive transliteration for Roman input.
    /// Tries case-sensitive match first, then lowercase match.
    /// </summary>
    /// <param name="input">Source text (Roman) to transliterate.</param>
    /// <param name="entries">Ordered lookup entries (source → target).</param>
    /// <returns>The transliterated result.</returns>
    public static string TransliterateRoman(string input, (string Source, string Target)[] entries)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        var result = new StringBuilder(input.Length * 2);
        int i = 0;

        while (i < input.Length)
        {
            bool matched = false;

            foreach (var (source, target) in entries)
            {
                if (source.Length == 0)
                    continue;

                if (i + source.Length <= input.Length)
                {
                    var span = input.AsSpan(i, source.Length);

                    // Try exact match first (important for case-sensitive entries like N, T, D)
                    if (span.SequenceEqual(source.AsSpan()))
                    {
                        result.Append(target);
                        i += source.Length;
                        matched = true;
                        break;
                    }

                    // Try case-insensitive match for lowercase entries
                    if (source.All(char.IsLower) &&
                        span.Equals(source.AsSpan(), StringComparison.OrdinalIgnoreCase))
                    {
                        result.Append(target);
                        i += source.Length;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched)
            {
                result.Append(input[i]);
                i++;
            }
        }

        return result.ToString();
    }

    /// <summary>
    /// Sorts entries by source length descending to ensure longest match first.
    /// </summary>
    public static (string Source, string Target)[] SortByLongestFirst((string Source, string Target)[] entries)
    {
        return entries
            .OrderByDescending(e => e.Source.Length)
            .ThenBy(e => e.Source, StringComparer.Ordinal)
            .ToArray();
    }
}
