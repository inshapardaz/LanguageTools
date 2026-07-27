using System.Text;
using ScriptConverter.Mappings;

namespace ScriptConverter.Converters;

/// <summary>
/// Converts Hindi Devanagari script text to Romanised form.
/// Handles the inherent 'a' vowel in Devanagari consonants and virama (halant).
/// </summary>
public sealed class HindiToRomanConverter : IScriptConverter
{
    private readonly (string Source, string Target)[] _entries;

    // Unicode ranges for Devanagari
    private const char DevanagariStart = '\u0900';
    private const char DevanagariEnd = '\u097F';
    private const char Virama = '\u094D';
    private const char ConsonantStart = '\u0915'; // क
    private const char ConsonantEnd = '\u0939';   // ह

    public HindiToRomanConverter()
    {
        var raw = HindiRomanMap.HindiToRomanEntries
            .Select(e => (Source: e.Hindi, Target: e.Roman))
            .ToArray();

        _entries = TransliterationEngine.SortByLongestFirst(raw);
    }

    /// <summary>
    /// Converts Hindi Devanagari text to Romanised form.
    /// Applies the inherent 'a' vowel rule: consonants without an explicit
    /// vowel sign or virama get an implicit 'a' appended.
    /// </summary>
    /// <param name="input">Text in Devanagari script.</param>
    /// <returns>Romanised representation.</returns>
    public string Convert(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // First pass: basic transliteration
        var basic = TransliterationEngine.Transliterate(input, _entries);

        // Second pass: add inherent 'a' where needed
        // This is a simplified approach. For more accurate results,
        // we process the original Devanagari and track consonant/vowel state.
        return AddInherentVowels(input);
    }

    private string AddInherentVowels(string input)
    {
        var result = new StringBuilder();
        int i = 0;

        while (i < input.Length)
        {
            bool matched = false;

            foreach (var (source, target) in _entries)
            {
                if (source.Length == 0)
                    continue;

                if (i + source.Length <= input.Length &&
                    input.AsSpan(i, source.Length).SequenceEqual(source.AsSpan()))
                {
                    bool isConsonant = IsDevanagariConsonant(source);

                    result.Append(target);

                    int next = i + source.Length;

                    if (isConsonant && next < input.Length)
                    {
                        // Check if next character is a vowel sign, virama, or another modifier
                        char nextChar = input[next];
                        bool hasExplicitVowel = IsVowelSign(nextChar) || nextChar == Virama;

                        if (!hasExplicitVowel)
                        {
                            // Add inherent 'a' only if not at end of word
                            // (word-final schwa deletion is common in Hindi)
                            bool atWordEnd = next >= input.Length ||
                                             !IsDevanagari(input[next]);

                            if (!atWordEnd)
                            {
                                result.Append('a');
                            }
                        }
                    }
                    else if (isConsonant && i + source.Length >= input.Length)
                    {
                        // Word-final consonant: schwa deletion (don't add 'a')
                    }

                    i += source.Length;
                    matched = true;
                    break;
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

    private static bool IsDevanagariConsonant(string s)
    {
        if (s.Length == 0) return false;
        char c = s[0];
        return c >= ConsonantStart && c <= ConsonantEnd;
    }

    private static bool IsVowelSign(char c)
    {
        // Devanagari vowel signs (matras): U+093E to U+094C
        // Also anusvara (U+0902), chandrabindu (U+0901), visarga (U+0903)
        return (c >= '\u093E' && c <= '\u094C') ||
               c == '\u0902' || c == '\u0901' || c == '\u0903';
    }

    private static bool IsDevanagari(char c)
    {
        return c >= DevanagariStart && c <= DevanagariEnd;
    }
}
