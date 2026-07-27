using ScriptConverter.Converters;
using ScriptConverter.Mappings;

namespace ScriptConverter.Dictionary;

/// <summary>
/// A transliterator that first looks up words in a dictionary, 
/// then falls back to the rule-based converter for unknown words.
/// Processes input word-by-word, preserving whitespace and punctuation.
/// </summary>
public sealed class DictionaryTransliterator
{
    private readonly IDictionaryStore _dictionary;
    private readonly ScriptTransliterator _ruleBasedFallback;

    public DictionaryTransliterator(IDictionaryStore dictionary)
    {
        _dictionary = dictionary;
        _ruleBasedFallback = new ScriptTransliterator();
    }

    /// <summary>
    /// Convert text using dictionary lookup first, rule-based fallback second.
    /// </summary>
    public string Convert(string input, Script from, Script to)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        if (from == to)
            return input;

        // For Roman → Urdu/Hindi, do word-level dictionary lookup
        if (from == Script.Roman)
        {
            return ConvertFromRoman(input, to);
        }

        // For non-Roman sources, use rule-based converter directly
        return _ruleBasedFallback.Convert(input, from, to);
    }

    private string ConvertFromRoman(string input, Script to)
    {
        var tokens = TokenizePreservingWhitespace(input);
        var result = new System.Text.StringBuilder();

        foreach (var token in tokens)
        {
            if (token.IsWhitespace)
            {
                result.Append(token.Text);
                continue;
            }

            // Try multi-word lookup first (up to 3 words)
            // Then single word lookup
            var dictResult = LookupWithTarget(token.Text, to);

            if (dictResult != null)
            {
                result.Append(dictResult);
            }
            else
            {
                // Fallback to rule-based conversion
                result.Append(_ruleBasedFallback.Convert(token.Text, Script.Roman, to));
            }
        }

        return result.ToString();
    }

    private string? LookupWithTarget(string word, Script target)
    {
        var entry = _dictionary.Lookup(word);
        if (entry == null) return null;

        return target switch
        {
            Script.UrduArabic => entry.Urdu,
            Script.HindiDevanagari => entry.Hindi,
            _ => null
        };
    }

    /// <summary>
    /// Try to look up multi-word phrases. Returns (result, wordsConsumed) or null.
    /// </summary>
    public (string result, int wordsConsumed)? TryMultiWordLookup(
        string[] words, int startIndex, Script target)
    {
        // Try 3-word, then 2-word phrases
        for (int len = Math.Min(3, words.Length - startIndex); len > 1; len--)
        {
            var phrase = string.Join(' ', words.Skip(startIndex).Take(len));
            var result = LookupWithTarget(phrase, target);
            if (result != null)
                return (result, len);
        }
        return null;
    }

    /// <summary>
    /// Advanced conversion that handles multi-word phrases.
    /// </summary>
    public string ConvertWithPhrases(string input, Script from, Script to)
    {
        if (string.IsNullOrEmpty(input) || from == to)
            return input;

        if (from != Script.Roman)
            return _ruleBasedFallback.Convert(input, from, to);

        var words = input.Split(' ', StringSplitOptions.None);
        var result = new System.Text.StringBuilder();
        int i = 0;

        while (i < words.Length)
        {
            if (string.IsNullOrWhiteSpace(words[i]))
            {
                result.Append(' ');
                i++;
                continue;
            }

            // Try multi-word lookup
            var multiResult = TryMultiWordLookup(words, i, to);
            if (multiResult != null)
            {
                if (i > 0) result.Append(' ');
                result.Append(multiResult.Value.result);
                i += multiResult.Value.wordsConsumed;
                continue;
            }

            // Single word
            if (i > 0) result.Append(' ');
            var single = LookupWithTarget(words[i], to);
            if (single != null)
            {
                result.Append(single);
            }
            else
            {
                result.Append(_ruleBasedFallback.Convert(words[i], Script.Roman, to));
            }
            i++;
        }

        return result.ToString();
    }

    private static List<(string Text, bool IsWhitespace)> TokenizePreservingWhitespace(string input)
    {
        var tokens = new List<(string Text, bool IsWhitespace)>();
        int i = 0;

        while (i < input.Length)
        {
            if (char.IsWhiteSpace(input[i]))
            {
                int start = i;
                while (i < input.Length && char.IsWhiteSpace(input[i])) i++;
                tokens.Add((input[start..i], true));
            }
            else
            {
                int start = i;
                while (i < input.Length && !char.IsWhiteSpace(input[i])) i++;
                tokens.Add((input[start..i], false));
            }
        }

        return tokens;
    }
}
