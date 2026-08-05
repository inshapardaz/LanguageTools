using System.Text.RegularExpressions;
using Nawishta.NaturalDictionary.Models;

namespace Nawishta.NaturalDictionary.Parsers;

/// <summary>
/// Utility that attempts to extract structured article data (pronunciation, senses, links)
/// from raw definition text (HTML or plain text).
/// 
/// This is best-effort parsing — dictionary sources vary wildly in their formatting.
/// When structure can't be reliably detected, the raw definition is stored as a single
/// sense with one meaning.
/// </summary>
public static class DefinitionStructurer
{
    // Common part-of-speech abbreviations found in dictionaries
    private static readonly HashSet<string> KnownPartsOfSpeech = new(StringComparer.OrdinalIgnoreCase)
    {
        "noun", "n", "n.", "verb", "v", "v.", "vt", "vt.", "vi", "vi.",
        "adjective", "adj", "adj.", "adverb", "adv", "adv.",
        "preposition", "prep", "prep.", "conjunction", "conj", "conj.",
        "pronoun", "pron", "pron.", "interjection", "interj", "interj.",
        "article", "art", "art.", "determiner", "det", "det.",
        "numeral", "num", "num.", "particle", "part", "part.",
        "suffix", "prefix", "infix",
        "masculine", "feminine", "neuter",
        "transitive", "intransitive",
        "countable", "uncountable",
        "plural", "singular",
        // Common abbreviations in Urdu/Hindi dictionaries
        "اسم", "فعل", "صفت", "حرف",
    };

    // Patterns for pronunciation (IPA, phonetic transcriptions)
    private static readonly Regex PronunciationPattern = new(
        @"[/\[]([ \w\u0250-\u02FF\u0300-\u036F\u0370-\u03FF\u1D00-\u1DBFˈˌːʰʷ.ˑ̃]+)[/\]]",
        RegexOptions.Compiled);

    // Pattern for numbered definitions: "1.", "2.", "1)", "2)", "①", "②"
    private static readonly Regex NumberedDefPattern = new(
        @"^(?:(\d+)[.)]\s*|([①②③④⑤⑥⑦⑧⑨⑩])\s*)",
        RegexOptions.Compiled | RegexOptions.Multiline);

    // Pattern for part-of-speech markers in text (often bold or italic in HTML)
    private static readonly Regex PosHtmlPattern = new(
        @"<(?:b|i|strong|em)>\s*((?:noun|verb|adj(?:ective)?|adv(?:erb)?|prep(?:osition)?|conj(?:unction)?|pron(?:oun)?|interj(?:ection)?|n\.|v\.|vt\.|vi\.|adj\.|adv\.|prep\.|conj\.?))\s*</(?:b|i|strong|em)>",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Pattern for synonym/antonym markers
    private static readonly Regex SynonymPattern = new(
        @"(?:syn(?:onym)?s?|مترادف)[:\s]+(.+?)(?:\n|<br|$)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex AntonymPattern = new(
        @"(?:ant(?:onym)?s?|متضاد)[:\s]+(.+?)(?:\n|<br|$)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex SeeAlsoPattern = new(
        @"(?:see\s+also|cf\.|compare|ملاحظہ)[:\s]+(.+?)(?:\n|<br|$)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex ExamplePattern = new(
        @"<span\s+class=""example"">(.*?)</span>",
        RegexOptions.Compiled | RegexOptions.Singleline);

    /// <summary>
    /// Attempt to extract structured data from a raw definition string.
    /// </summary>
    /// <param name="rawDefinition">The raw definition (HTML or plain text).</param>
    /// <returns>Extracted pronunciation, senses, and links.</returns>
    public static (string? Pronunciation, List<WordSense> Senses, List<WordLink> Links) Extract(string? rawDefinition)
    {
        if (string.IsNullOrWhiteSpace(rawDefinition))
            return (null, [], []);

        var pronunciation = ExtractPronunciation(rawDefinition);
        var links = ExtractLinks(rawDefinition);
        var senses = ExtractSenses(rawDefinition);

        // If no structured senses could be extracted, create a single fallback sense
        if (senses.Count == 0)
        {
            var cleanDef = StripHtml(rawDefinition).Trim();
            if (!string.IsNullOrWhiteSpace(cleanDef))
            {
                senses.Add(new WordSense
                {
                    Meanings = [new Meaning { Definition = cleanDef }]
                });
            }
        }

        return (pronunciation, senses, links);
    }

    /// <summary>
    /// Extract structured data from a DSL raw definition (before HTML conversion).
    /// DSL format provides more reliable structure markers.
    /// </summary>
    public static (string? Pronunciation, List<WordSense> Senses, List<WordLink> Links) ExtractFromDsl(string rawDsl)
    {
        if (string.IsNullOrWhiteSpace(rawDsl))
            return (null, [], []);

        var pronunciation = ExtractDslPronunciation(rawDsl);
        var links = ExtractDslLinks(rawDsl);
        var senses = ExtractDslSenses(rawDsl);

        // Fallback: if no senses extracted, use the whole thing as one meaning
        if (senses.Count == 0)
        {
            var cleanText = StripDslTags(rawDsl).Trim();
            if (!string.IsNullOrWhiteSpace(cleanText))
            {
                senses.Add(new WordSense
                {
                    Meanings = [new Meaning { Definition = cleanText }]
                });
            }
        }

        return (pronunciation, senses, links);
    }

    private static string? ExtractPronunciation(string text)
    {
        var match = PronunciationPattern.Match(text);
        return match.Success ? match.Groups[1].Value.Trim() : null;
    }

    private static string? ExtractDslPronunciation(string dsl)
    {
        // DSL transcription is often in [t]...[/t] tags
        var match = Regex.Match(dsl, @"\[t\](.*?)\[/t\]", RegexOptions.Singleline);
        if (match.Success)
            return match.Groups[1].Value.Trim();

        // Also try standard IPA brackets
        return ExtractPronunciation(dsl);
    }

    private static List<WordLink> ExtractLinks(string text)
    {
        var links = new List<WordLink>();

        // Synonyms
        var synMatch = SynonymPattern.Match(text);
        if (synMatch.Success)
        {
            foreach (var word in SplitLinkedWords(synMatch.Groups[1].Value))
            {
                links.Add(new WordLink { LinkType = WordLinkType.Synonym, TargetWord = word });
            }
        }

        // Antonyms
        var antMatch = AntonymPattern.Match(text);
        if (antMatch.Success)
        {
            foreach (var word in SplitLinkedWords(antMatch.Groups[1].Value))
            {
                links.Add(new WordLink { LinkType = WordLinkType.Antonym, TargetWord = word });
            }
        }

        // See also
        var seeMatch = SeeAlsoPattern.Match(text);
        if (seeMatch.Success)
        {
            foreach (var word in SplitLinkedWords(seeMatch.Groups[1].Value))
            {
                links.Add(new WordLink { LinkType = WordLinkType.SeeAlso, TargetWord = word });
            }
        }

        return links;
    }

    private static List<WordLink> ExtractDslLinks(string dsl)
    {
        var links = new List<WordLink>();

        // DSL cross-references: [ref]word[/ref]
        var refMatches = Regex.Matches(dsl, @"\[ref\](.*?)\[/ref\]");
        foreach (Match m in refMatches)
        {
            var word = m.Groups[1].Value.Trim();
            if (!string.IsNullOrWhiteSpace(word))
                links.Add(new WordLink { LinkType = WordLinkType.SeeAlso, TargetWord = word });
        }

        // Also try text-based syn/ant patterns
        links.AddRange(ExtractLinks(dsl));

        return links;
    }

    private static List<WordSense> ExtractSenses(string html)
    {
        var senses = new List<WordSense>();

        // Try to detect part-of-speech blocks first
        var posMatches = PosHtmlPattern.Matches(html);
        if (posMatches.Count > 0)
        {
            // Split definition by POS markers
            for (int i = 0; i < posMatches.Count; i++)
            {
                var posMatch = posMatches[i];
                var pos = NormalizePartOfSpeech(posMatch.Groups[1].Value);

                var startIdx = posMatch.Index + posMatch.Length;
                var endIdx = (i + 1 < posMatches.Count) ? posMatches[i + 1].Index : html.Length;
                var sectionHtml = html[startIdx..endIdx];

                var meanings = ExtractMeaningsFromSection(sectionHtml);
                if (meanings.Count > 0)
                {
                    senses.Add(new WordSense { PartOfSpeech = pos, Meanings = meanings });
                }
            }
        }

        // If no POS markers found, try numbered definitions
        if (senses.Count == 0)
        {
            var plainText = StripHtml(html);
            var meanings = ExtractNumberedMeanings(plainText);
            if (meanings.Count > 1)
            {
                senses.Add(new WordSense { Meanings = meanings });
            }
        }

        return senses;
    }

    private static List<WordSense> ExtractDslSenses(string dsl)
    {
        var senses = new List<WordSense>();
        var lines = dsl.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        WordSense? currentSense = null;
        var currentMeaningLines = new List<string>();
        var currentExamples = new List<string>();

        foreach (var rawLine in lines)
        {
            var line = rawLine.Trim();

            // Skip transcription and grammar tags at the top
            if (Regex.IsMatch(line, @"^\[t\]") || string.IsNullOrWhiteSpace(line))
                continue;

            // Detect part of speech: typically bold text at margin level 1
            var posMatch = Regex.Match(line, @"^\[m1?\]\[b\](.*?)\[/b\]");
            if (!posMatch.Success)
                posMatch = Regex.Match(line, @"^\[p\](.*?)\[/p\]");

            if (posMatch.Success && IsPartOfSpeech(posMatch.Groups[1].Value))
            {
                // Save previous sense
                FlushMeaning(currentSense, currentMeaningLines, currentExamples);
                if (currentSense != null && currentSense.Meanings.Count > 0)
                    senses.Add(currentSense);

                currentSense = new WordSense
                {
                    PartOfSpeech = NormalizePartOfSpeech(posMatch.Groups[1].Value),
                    Meanings = []
                };
                currentMeaningLines.Clear();
                currentExamples.Clear();
                continue;
            }

            // Numbered definition line: [m2]1) meaning text
            var numMatch = Regex.Match(line, @"^\[m\d?\]\s*\d+[.)]\s*(.*)");
            if (numMatch.Success)
            {
                // Flush previous meaning
                FlushMeaning(currentSense ?? (currentSense = new WordSense { Meanings = [] }),
                    currentMeaningLines, currentExamples);
                currentMeaningLines.Clear();
                currentExamples.Clear();

                var meaningText = StripDslTags(numMatch.Groups[1].Value).Trim();
                if (!string.IsNullOrWhiteSpace(meaningText))
                    currentMeaningLines.Add(meaningText);
                continue;
            }

            // Example line: [ex]...[/ex]
            var exMatch = Regex.Match(line, @"\[ex\](.*?)\[/ex\]", RegexOptions.Singleline);
            if (exMatch.Success)
            {
                var example = StripDslTags(exMatch.Groups[1].Value).Trim();
                if (!string.IsNullOrWhiteSpace(example))
                    currentExamples.Add(example);
                continue;
            }

            // Translation zone content [trn]...[/trn]
            var trnMatch = Regex.Match(line, @"\[trn\](.*?)\[/trn\]", RegexOptions.Singleline);
            if (trnMatch.Success)
            {
                var meaning = StripDslTags(trnMatch.Groups[1].Value).Trim();
                if (!string.IsNullOrWhiteSpace(meaning))
                    currentMeaningLines.Add(meaning);
                continue;
            }

            // Generic content line
            var cleaned = StripDslTags(line).Trim();
            if (!string.IsNullOrWhiteSpace(cleaned) && cleaned.Length > 1)
            {
                currentMeaningLines.Add(cleaned);
            }
        }

        // Flush last sense
        FlushMeaning(currentSense ?? (currentSense = new WordSense { Meanings = [] }),
            currentMeaningLines, currentExamples);
        if (currentSense != null && currentSense.Meanings.Count > 0)
            senses.Add(currentSense);

        return senses;
    }

    private static void FlushMeaning(WordSense? sense, List<string> meaningLines, List<string> examples)
    {
        if (sense == null || meaningLines.Count == 0)
            return;

        var defText = string.Join(" ", meaningLines).Trim();
        if (!string.IsNullOrWhiteSpace(defText))
        {
            sense.Meanings.Add(new Meaning
            {
                Definition = defText,
                Examples = examples.Count > 0 ? new List<string>(examples) : [],
            });
        }
    }

    private static List<Meaning> ExtractMeaningsFromSection(string html)
    {
        var meanings = new List<Meaning>();
        var plainText = StripHtml(html);

        // Try numbered meanings
        var numbered = ExtractNumberedMeanings(plainText);
        if (numbered.Count > 0)
            return numbered;

        // Extract examples from HTML
        var examples = new List<string>();
        var exMatches = ExamplePattern.Matches(html);
        foreach (Match m in exMatches)
        {
            var ex = StripHtml(m.Groups[1].Value).Trim();
            if (!string.IsNullOrWhiteSpace(ex))
                examples.Add(ex);
        }

        // Single meaning from the whole section
        var defText = plainText.Trim();
        if (!string.IsNullOrWhiteSpace(defText))
        {
            meanings.Add(new Meaning
            {
                Definition = defText,
                Examples = examples,
            });
        }

        return meanings;
    }

    private static List<Meaning> ExtractNumberedMeanings(string text)
    {
        var meanings = new List<Meaning>();

        // Split by numbered patterns
        var parts = NumberedDefPattern.Split(text);

        // If we have numbered parts (at least 2 definitions)
        if (parts.Length >= 3)
        {
            // parts will be: [preamble, num1, text1, num2, text2, ...]
            for (int i = 1; i < parts.Length; i++)
            {
                var part = parts[i].Trim();
                if (string.IsNullOrWhiteSpace(part) || part.Length <= 2)
                    continue;

                // Skip the number/marker parts
                if (Regex.IsMatch(part, @"^\d+$") || part.Length == 1)
                    continue;

                meanings.Add(new Meaning { Definition = part });
            }
        }

        return meanings;
    }

    private static bool IsPartOfSpeech(string text)
    {
        var cleaned = StripDslTags(text).Trim().TrimEnd('.');
        return KnownPartsOfSpeech.Contains(cleaned);
    }

    private static string NormalizePartOfSpeech(string raw)
    {
        var cleaned = StripDslTags(raw).Trim().TrimEnd('.').ToLowerInvariant();
        return cleaned switch
        {
            "n" => "noun",
            "v" or "vt" or "vi" => "verb",
            "adj" => "adjective",
            "adv" => "adverb",
            "prep" => "preposition",
            "conj" => "conjunction",
            "pron" => "pronoun",
            "interj" => "interjection",
            "art" => "article",
            "det" => "determiner",
            "num" => "numeral",
            "part" => "particle",
            _ => cleaned,
        };
    }

    private static IEnumerable<string> SplitLinkedWords(string text)
    {
        var cleaned = StripHtml(text).Trim();
        return cleaned.Split([',', ';', '،'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(w => w.Length > 0 && w.Length < 100);
    }

    private static string StripHtml(string html)
    {
        if (string.IsNullOrEmpty(html)) return string.Empty;
        var text = Regex.Replace(html, @"<br\s*/?>", "\n");
        text = Regex.Replace(text, @"<[^>]+>", " ");
        text = Regex.Replace(text, @"\s+", " ");
        return System.Net.WebUtility.HtmlDecode(text);
    }

    private static string StripDslTags(string dsl)
    {
        if (string.IsNullOrEmpty(dsl)) return string.Empty;
        var text = Regex.Replace(dsl, @"\[[^\]]*\]", "");
        text = text.Replace("\\[", "[").Replace("\\]", "]");
        return text.Trim();
    }
}
