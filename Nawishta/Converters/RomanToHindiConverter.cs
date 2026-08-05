using System.Text;
using Nawishta.Mappings;

namespace  Nawishta.Converters;

/// <summary>
/// Converts Romanised text to Hindi Devanagari script.
/// Handles vowel placement (independent vs matra form) based on context.
/// </summary>
public sealed class RomanToHindiConverter : IScriptConverter
{
    private readonly (string Source, string Target)[] _entries;

    // Devanagari character ranges
    private const char ConsonantStart = '\u0915'; // क
    private const char ConsonantEnd = '\u0939';   // ह
    private const char Nukta = '\u093C';
    private const char Virama = '\u094D';

    // Independent vowel to matra mapping
    private static readonly Dictionary<string, string> VowelToMatra = new()
    {
        ["\u0905"] = "",       // अ → (inherent, no matra needed)
        ["\u0906"] = "\u093E", // आ → ा
        ["\u0907"] = "\u093F", // इ → ि
        ["\u0908"] = "\u0940", // ई → ी
        ["\u0909"] = "\u0941", // उ → ु
        ["\u090A"] = "\u0942", // ऊ → ू
        ["\u090F"] = "\u0947", // ए → े
        ["\u0910"] = "\u0948", // ऐ → ै
        ["\u0913"] = "\u094B", // ओ → ो
        ["\u0914"] = "\u094C", // औ → ौ
    };

    // Matra targets (what the Roman→Hindi table produces for vowels after consonants)
    private static readonly HashSet<string> MatraValues =
    [
        "\u093E", "\u093F", "\u0940", "\u0941", "\u0942",
        "\u0947", "\u0948", "\u094B", "\u094C"
    ];

    // Independent vowels
    private static readonly Dictionary<string, string> MatraToIndependent = new()
    {
        ["\u093E"] = "\u0906", // ा → आ
        ["\u093F"] = "\u0907", // ि → इ
        ["\u0940"] = "\u0908", // ी → ई
        ["\u0941"] = "\u0909", // ु → उ
        ["\u0942"] = "\u090A", // ू → ऊ
        ["\u0947"] = "\u090F", // े → ए
        ["\u0948"] = "\u0910", // ै → ऐ
        ["\u094B"] = "\u0913", // ो → ओ
        ["\u094C"] = "\u0914", // ौ → औ
    };

    public RomanToHindiConverter()
    {
        var raw = HindiRomanMap.RomanToHindiEntries
            .Select(e => (Source: e.Roman, Target: e.Hindi))
            .ToArray();

        _entries = TransliterationEngine.SortByLongestFirst(raw);
    }

    /// <summary>
    /// Converts Romanised text to Hindi Devanagari.
    /// Correctly places vowels as independent characters at word start
    /// and as matras (dependent forms) after consonants.
    /// </summary>
    /// <param name="input">Romanised text.</param>
    /// <returns>Hindi Devanagari text.</returns>
    public string Convert(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // Phase 1: basic transliteration
        var tokens = Tokenize(input);

        // Phase 2: fix vowel placement context
        return FixVowelContext(tokens);
    }

    private List<string> Tokenize(string input)
    {
        var tokens = new List<string>();
        int i = 0;

        while (i < input.Length)
        {
            bool matched = false;

            foreach (var (source, target) in _entries)
            {
                if (source.Length == 0)
                    continue;

                if (i + source.Length <= input.Length)
                {
                    var span = input.AsSpan(i, source.Length);

                    // Exact match
                    if (span.SequenceEqual(source.AsSpan()))
                    {
                        tokens.Add(target);
                        i += source.Length;
                        matched = true;
                        break;
                    }

                    // Case-insensitive for lowercase entries
                    if (source.All(char.IsLower) &&
                        span.Equals(source.AsSpan(), StringComparison.OrdinalIgnoreCase))
                    {
                        tokens.Add(target);
                        i += source.Length;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched)
            {
                tokens.Add(input[i].ToString());
                i++;
            }
        }

        return tokens;
    }

    private static string FixVowelContext(List<string> tokens)
    {
        var result = new StringBuilder();
        bool lastWasConsonant = false;

        for (int i = 0; i < tokens.Count; i++)
        {
            string token = tokens[i];

            if (IsConsonantToken(token))
            {
                result.Append(token);
                lastWasConsonant = true;

                // Check if next token is a vowel/matra
                bool nextIsVowel = i + 1 < tokens.Count &&
                                   (MatraValues.Contains(tokens[i + 1]) ||
                                    IsIndependentVowel(tokens[i + 1]));

                // If next is not a vowel and not end of word, the inherent 'a' applies
                // (Devanagari consonants have inherent 'a', so no virama needed unless
                //  followed by another consonant)
                if (!nextIsVowel && i + 1 < tokens.Count && IsConsonantToken(tokens[i + 1]))
                {
                    // Add virama to suppress inherent 'a' before next consonant
                    result.Append(Virama);
                    lastWasConsonant = false;
                }
            }
            else if (MatraValues.Contains(token))
            {
                if (lastWasConsonant)
                {
                    // After a consonant: use matra form (already in matra form)
                    result.Append(token);
                }
                else
                {
                    // At word start or after vowel: use independent vowel form
                    if (MatraToIndependent.TryGetValue(token, out var independent))
                    {
                        result.Append(independent);
                    }
                    else
                    {
                        result.Append(token);
                    }
                }
                lastWasConsonant = false;
            }
            else if (IsIndependentVowel(token))
            {
                if (lastWasConsonant && VowelToMatra.TryGetValue(token, out var matra))
                {
                    // After consonant: convert independent vowel to matra
                    if (!string.IsNullOrEmpty(matra))
                    {
                        result.Append(matra);
                    }
                    // Empty matra means inherent 'a', which is already present
                }
                else
                {
                    result.Append(token);
                }
                lastWasConsonant = false;
            }
            else
            {
                // Spaces, punctuation, pass-through
                result.Append(token);
                lastWasConsonant = false;
            }
        }

        return result.ToString();
    }

    private static bool IsConsonantToken(string token)
    {
        if (string.IsNullOrEmpty(token)) return false;
        char c = token[0];
        // Is it a Devanagari consonant (with or without nukta)?
        if (c >= ConsonantStart && c <= ConsonantEnd) return true;
        // Consonant + nukta combination
        if (token.Length >= 2 && c >= ConsonantStart && c <= ConsonantEnd && token[1] == Nukta) return true;
        return false;
    }

    private static bool IsIndependentVowel(string token)
    {
        if (string.IsNullOrEmpty(token)) return false;
        char c = token[0];
        return c >= '\u0905' && c <= '\u0914';
    }
}
