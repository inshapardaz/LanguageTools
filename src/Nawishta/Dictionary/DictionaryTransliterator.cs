using Nawishta.Converters;
using Nawishta.Mappings;

namespace Nawishta.Dictionary;

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
        // Normalize: strip punctuation and lowercase for case-insensitive matching
        var cleaned = word.Trim();
        // Strip leading and trailing punctuation
        int start = 0, end = cleaned.Length;
        while (start < end && char.IsPunctuation(cleaned[start])) start++;
        while (end > start && char.IsPunctuation(cleaned[end - 1])) end--;
        if (start >= end) return null;
        cleaned = cleaned[start..end];

        var entry = _dictionary.Lookup(cleaned);
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

        // Tokenize preserving all whitespace (spaces, newlines, tabs)
        var tokens = TokenizePreservingWhitespace(input);
        var result = new System.Text.StringBuilder();

        // Collect non-whitespace tokens for multi-word lookup
        var wordTokens = tokens.Where(t => !t.IsWhitespace).Select(t => t.Text).ToArray();
        int wordIndex = 0;
        // Track which word tokens have been consumed by multi-word phrases
        var consumed = new HashSet<int>();

        // Try multi-word phrases first (pre-compute)
        var phraseResults = new Dictionary<int, (string result, int count)>();
        for (int wi = 0; wi < wordTokens.Length; wi++)
        {
            if (consumed.Contains(wi)) continue;
            var multiResult = TryMultiWordLookup(wordTokens, wi, to);
            if (multiResult != null)
            {
                phraseResults[wi] = multiResult.Value;
                for (int c = 0; c < multiResult.Value.wordsConsumed; c++)
                    consumed.Add(wi + c);
            }
        }

        // Now iterate tokens and build result
        wordIndex = 0;
        foreach (var token in tokens)
        {
            if (token.IsWhitespace)
            {
                result.Append(token.Text);
                continue;
            }

            // Check if this word is part of a multi-word phrase
            if (phraseResults.TryGetValue(wordIndex, out var phrase))
            {
                result.Append(phrase.result);
                wordIndex++;
                continue;
            }

            if (consumed.Contains(wordIndex))
            {
                // Skip — already consumed by a phrase starting earlier
                wordIndex++;
                continue;
            }

            // Single word — strip punctuation, lookup, convert
            var rawWord = token.Text;
            int pStart = 0, pEnd = rawWord.Length;
            while (pStart < pEnd && char.IsPunctuation(rawWord[pStart])) pStart++;
            while (pEnd > pStart && char.IsPunctuation(rawWord[pEnd - 1])) pEnd--;

            if (pStart >= pEnd)
            {
                result.Append(rawWord); // entirely punctuation
            }
            else
            {
                var leadPunct = rawWord[..pStart];
                var trailPunct = rawWord[pEnd..];
                var cleanWord = rawWord[pStart..pEnd];

                result.Append(leadPunct);
                var single = LookupWithTarget(cleanWord, to);
                if (single != null)
                {
                    result.Append(single);
                }
                else
                {
                    result.Append(_ruleBasedFallback.Convert(cleanWord, Script.Roman, to));
                }
                result.Append(trailPunct);
            }

            wordIndex++;
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
