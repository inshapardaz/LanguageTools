using System.Text;
using ScriptConverter.Mappings;

namespace ScriptConverter.Converters;

/// <summary>
/// Converts Romanised Urdu text to Urdu Arabic script.
/// 
/// Urdu orthographic rules applied:
/// - Word-initial "a" → alif (ا)
/// - "a" after the first consonant cluster at word start → omitted (short zabar)
/// - "a" before the last consonant of a word → alif (ا)
/// - Word-final "a" after ی (ye) → chooti he (ہ) [common Urdu ending]
/// - Word-final "a" otherwise → alif (ا)
/// - "aa" → alif (ا) always; at word start → alif madda (آ)
/// - "i"/"u" between consonants → omitted (short vowel)
/// - "ai" at word end or before consonant → ائ + ے (alif + hamza-ye + bari ye)
/// - "ee" → ye (ی)
/// - "oo" → waw (و)
/// </summary>
public sealed class RomanToUrduConverter : IScriptConverter
{
    // Consonant mappings (longest match first)
    private static readonly (string Roman, string Urdu)[] ConsonantEntries =
    [
        ("kh", "\u062E"),   // خ
        ("gh", "\u063A"),   // غ
        ("ch", "\u0686"),   // چ
        ("sh", "\u0634"),   // ش
        ("zh", "\u0698"),   // ژ
        ("th", "\u062B"),   // ث
        ("tt", "\u0679"),   // ٹ
        ("dd", "\u0688"),   // ڈ
        ("rr", "\u0691"),   // ڑ
        ("nn", "\u06BA"),   // ں
        ("b", "\u0628"),    // ب
        ("p", "\u067E"),    // پ
        ("t", "\u062A"),    // ت
        ("j", "\u062C"),    // ج
        ("h", "\u06C1"),    // ہ
        ("d", "\u062F"),    // د
        ("r", "\u0631"),    // ر
        ("z", "\u0632"),    // ز
        ("s", "\u0633"),    // س
        ("f", "\u0641"),    // ف
        ("q", "\u0642"),    // ق
        ("k", "\u06A9"),    // ک
        ("g", "\u06AF"),    // گ
        ("l", "\u0644"),    // ل
        ("m", "\u0645"),    // م
        ("n", "\u0646"),    // ن
        ("w", "\u0648"),    // و
        ("v", "\u0648"),    // و
        ("y", "\u06CC"),    // ی
        ("N", "\u06BA"),    // ں
    ];

    // Long vowel mappings (checked before short vowels)
    private static readonly (string Roman, string Urdu)[] LongVowelEntries =
    [
        ("aa", "\u0627"),   // ا (alif for long aa)
        ("ee", "\u06CC"),   // ی (ye for long ee)
        ("oo", "\u0648"),   // و (waw for long oo)
        ("ai", "\u0627\u0626\u06D2"),  // ائے (alif + hamza-on-ye + bari ye)
        ("au", "\u0648"),   // و
        ("ay", "\u06D2"),   // ے (bari ye)
        ("ia", "\u06CC\u06C1"), // یہ (ye + chooti he — common word ending)
    ];

    // Numeral mappings
    private static readonly (string Roman, string Urdu)[] NumeralEntries =
    [
        ("0", "\u06F0"), ("1", "\u06F1"), ("2", "\u06F2"), ("3", "\u06F3"), ("4", "\u06F4"),
        ("5", "\u06F5"), ("6", "\u06F6"), ("7", "\u06F7"), ("8", "\u06F8"), ("9", "\u06F9"),
    ];

    // Punctuation mappings
    private static readonly (string Roman, string Urdu)[] PunctuationEntries =
    [
        (".", "\u06D4"), (",", "\u060C"), ("?", "\u061F"), (";", "\u061B"),
    ];

    /// <summary>
    /// Converts Romanised Urdu text to Urdu Arabic script.
    /// </summary>
    /// <param name="input">Romanised Urdu text.</param>
    /// <returns>Urdu Arabic script representation.</returns>
    public string Convert(string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // Process word by word to apply word-boundary-aware rules
        var result = new StringBuilder(input.Length * 2);
        var words = SplitKeepingSeparators(input);

        foreach (var segment in words)
        {
            if (string.IsNullOrEmpty(segment))
                continue;

            if (char.IsWhiteSpace(segment[0]) || !char.IsLetter(segment[0]))
            {
                // Non-word segment: process character by character for numerals/punctuation
                result.Append(ProcessNonWord(segment));
            }
            else
            {
                result.Append(ConvertWord(segment));
            }
        }

        return result.ToString();
    }

    private static string ProcessNonWord(string segment)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < segment.Length; i++)
        {
            if (TryMatch(segment, i, NumeralEntries, out var numTarget, out int numLen))
            {
                sb.Append(numTarget);
                i += numLen - 1;
            }
            else if (TryMatch(segment, i, PunctuationEntries, out var puncTarget, out int puncLen))
            {
                sb.Append(puncTarget);
                i += puncLen - 1;
            }
            else
            {
                sb.Append(segment[i]);
            }
        }
        return sb.ToString();
    }

    private static string ConvertWord(string word)
    {
        // First, tokenize the word into a sequence of (type, roman, urdu) tokens
        var tokens = TokenizeWord(word);

        // Then apply Urdu orthographic rules
        return ApplyOrthographicRules(tokens);
    }

    private enum TokenType { Consonant, ShortVowelA, ShortVowelI, ShortVowelU, ShortVowelE, ShortVowelO, LongVowel, Unknown }

    private record struct Token(TokenType Type, string Roman, string Urdu);

    private static List<Token> TokenizeWord(string word)
    {
        var tokens = new List<Token>();
        int i = 0;

        while (i < word.Length)
        {
            // Try long vowels first
            if (TryMatch(word, i, LongVowelEntries, out var longTarget, out int longLen))
            {
                tokens.Add(new Token(TokenType.LongVowel, word.Substring(i, longLen), longTarget));
                i += longLen;
                continue;
            }

            // Try consonants
            if (TryMatch(word, i, ConsonantEntries, out var consTarget, out int consLen))
            {
                tokens.Add(new Token(TokenType.Consonant, word.Substring(i, consLen), consTarget));
                i += consLen;
                continue;
            }

            // Short vowels
            char lower = char.ToLowerInvariant(word[i]);
            switch (lower)
            {
                case 'a':
                    tokens.Add(new Token(TokenType.ShortVowelA, "a", "\u0627")); // default alif
                    break;
                case 'i':
                    tokens.Add(new Token(TokenType.ShortVowelI, "i", ""));
                    break;
                case 'u':
                    tokens.Add(new Token(TokenType.ShortVowelU, "u", ""));
                    break;
                case 'e':
                    tokens.Add(new Token(TokenType.ShortVowelE, "e", "\u06D2")); // bari ye
                    break;
                case 'o':
                    tokens.Add(new Token(TokenType.ShortVowelO, "o", "\u0648")); // waw
                    break;
                default:
                    tokens.Add(new Token(TokenType.Unknown, word[i].ToString(), word[i].ToString()));
                    break;
            }
            i++;
        }

        return tokens;
    }

    private static string ApplyOrthographicRules(List<Token> tokens)
    {
        var result = new StringBuilder();
        int consonantsSeen = 0; // count of consonants seen from word start

        for (int i = 0; i < tokens.Count; i++)
        {
            var token = tokens[i];

            switch (token.Type)
            {
                case TokenType.Consonant:
                    result.Append(token.Urdu);
                    consonantsSeen++;
                    break;

                case TokenType.LongVowel:
                    string romanLower = token.Roman.ToLowerInvariant();
                    if (romanLower == "aa" && i == 0)
                    {
                        // Word-initial "aa" → alif madda آ
                        result.Append('\u0622');
                    }
                    else if (romanLower == "ia")
                    {
                        // "ia" ending → یہ (ye + chooti he)
                        result.Append(token.Urdu);
                    }
                    else
                    {
                        result.Append(token.Urdu);
                    }
                    break;

                case TokenType.ShortVowelA:
                    // Apply context-sensitive rules for 'a':
                    if (i == 0)
                    {
                        // Word-initial 'a' → alif
                        result.Append('\u0627');
                    }
                    else if (IsWordFinal(tokens, i))
                    {
                        // Word-final 'a':
                        // After ye/ee sound → chooti he (ہ) [common -iya/-ia ending]
                        // Otherwise → alif (ا)
                        if (i > 0 && PreviousTokenIsYe(tokens, i))
                        {
                            result.Append('\u06C1'); // ہ
                        }
                        else
                        {
                            result.Append('\u0627'); // ا
                        }
                    }
                    else if (consonantsSeen == 1 && i == 1 && HasMoreConsonantsAfter(tokens, i))
                    {
                        // 'a' after first consonant at word start.
                        // Drop it (short vowel/zabar) ONLY if the consonant that follows
                        // is itself followed by a vowel — meaning this 'a' is an unstressed
                        // schwa in a CaCVC pattern like "salam" (s-a-l-a-m).
                        // Keep it as alif if the next consonant is followed by another consonant
                        // or is word-final (like "ghar" = gh-a-r, "par" = p-a-r).
                        if (NextConsonantIsFollowedByVowel(tokens, i))
                        {
                            // Short vowel in unstressed position, omit
                            // e.g., "salam" first 'a': next consonant 'l' is followed by vowel 'a'
                        }
                        else
                        {
                            // The vowel is stressed / forms the syllable nucleus → alif
                            // e.g., "ghar" 'a': next consonant 'r' is word-final
                            // e.g., "pakistan" 'a': next consonant 'k' is followed by consonant 's'
                            result.Append('\u0627');
                        }
                    }
                    else
                    {
                        // 'a' between consonants in other positions:
                        // If followed by a consonant cluster (2+ consonants), it's likely
                        // a short vowel (zabar) → omit. e.g., "pasand" second 'a' before "nd"
                        // Otherwise → alif (ا). e.g., "salam" second 'a' before final "m"
                        if (IsFollowedByConsonantCluster(tokens, i))
                        {
                            // Short vowel before cluster, omit
                        }
                        else
                        {
                            result.Append('\u0627');
                        }
                    }
                    break;

                case TokenType.ShortVowelI:
                    if (i == 0 || IsWordFinal(tokens, i))
                    {
                        result.Append('\u0627'); // alif at boundaries
                    }
                    // Between consonants: omit (zer)
                    break;

                case TokenType.ShortVowelU:
                    if (i == 0 || IsWordFinal(tokens, i))
                    {
                        result.Append('\u0627'); // alif at boundaries
                    }
                    // Between consonants: omit (pesh)
                    break;

                case TokenType.ShortVowelE:
                    result.Append(token.Urdu); // bari ye ے
                    break;

                case TokenType.ShortVowelO:
                    result.Append(token.Urdu); // waw و
                    break;

                case TokenType.Unknown:
                    result.Append(token.Urdu);
                    break;
            }
        }

        return result.ToString();
    }

    private static bool IsWordFinal(List<Token> tokens, int index)
    {
        // Token is word-final if no more tokens follow, or only followed by nothing
        return index == tokens.Count - 1;
    }

    private static bool PreviousTokenIsYe(List<Token> tokens, int index)
    {
        // Check if the previous token produced a ye-like character
        if (index <= 0) return false;
        var prev = tokens[index - 1];
        // Check if it's a long vowel "ee", "ai", or "ia" prefix, or consonant "y"
        if (prev.Type == TokenType.LongVowel &&
            (prev.Roman.Equals("ee", StringComparison.OrdinalIgnoreCase) ||
             prev.Roman.Equals("ai", StringComparison.OrdinalIgnoreCase)))
            return true;
        if (prev.Type == TokenType.ShortVowelI)
            return true;
        if (prev.Type == TokenType.Consonant && prev.Roman.Equals("y", StringComparison.OrdinalIgnoreCase))
            return true;
        return false;
    }

    private static bool HasMoreConsonantsAfter(List<Token> tokens, int index)
    {
        // Check if there are consonants after this position
        for (int i = index + 1; i < tokens.Count; i++)
        {
            if (tokens[i].Type == TokenType.Consonant)
                return true;
        }
        return false;
    }

    private static bool NextConsonantIsFollowedByVowel(List<Token> tokens, int index)
    {
        // Find the next consonant after this vowel, then check if it's followed by
        // the same vowel ('a'). This identifies the CaCaC pattern where the first 'a'
        // is typically a short schwa (e.g., "salam" → first 'a' is short).
        // If followed by a different vowel (e.g., "pakistan" → p-a-k-i), keep the 'a'
        // as alif because it's a distinct long vowel.
        int nextConsonantIdx = -1;
        for (int i = index + 1; i < tokens.Count; i++)
        {
            if (tokens[i].Type == TokenType.Consonant)
            {
                nextConsonantIdx = i;
                break;
            }
        }

        if (nextConsonantIdx < 0) return false;

        // Check what follows the next consonant
        int afterConsonant = nextConsonantIdx + 1;
        if (afterConsonant >= tokens.Count) return false; // consonant is word-final

        var following = tokens[afterConsonant];
        // Only consider it a short schwa if followed by another 'a' (same vowel pattern)
        return following.Type == TokenType.ShortVowelA;
    }

    private static bool IsFollowedByConsonantCluster(List<Token> tokens, int index)
    {
        // Check if immediately followed by 2+ consecutive consonants
        int consecutiveConsonants = 0;
        for (int i = index + 1; i < tokens.Count; i++)
        {
            if (tokens[i].Type == TokenType.Consonant)
            {
                consecutiveConsonants++;
                if (consecutiveConsonants >= 2)
                    return true;
            }
            else
            {
                break;
            }
        }
        return false;
    }

    private static bool TryMatch(string input, int pos, (string Roman, string Urdu)[] entries,
        out string target, out int matchLen)
    {
        foreach (var (roman, urdu) in entries)
        {
            if (pos + roman.Length <= input.Length)
            {
                var span = input.AsSpan(pos, roman.Length);
                if (span.Equals(roman.AsSpan(), StringComparison.OrdinalIgnoreCase))
                {
                    target = urdu;
                    matchLen = roman.Length;
                    return true;
                }
            }
        }
        target = "";
        matchLen = 0;
        return false;
    }

    /// <summary>
    /// Splits input into word segments and separators (spaces, punctuation, digits).
    /// </summary>
    private static List<string> SplitKeepingSeparators(string input)
    {
        var segments = new List<string>();
        var current = new StringBuilder();
        bool inWord = char.IsLetter(input[0]);

        for (int i = 0; i < input.Length; i++)
        {
            bool isLetter = char.IsLetter(input[i]);
            if (isLetter == inWord)
            {
                current.Append(input[i]);
            }
            else
            {
                if (current.Length > 0)
                    segments.Add(current.ToString());
                current.Clear();
                current.Append(input[i]);
                inWord = isLetter;
            }
        }

        if (current.Length > 0)
            segments.Add(current.ToString());

        return segments;
    }
}
