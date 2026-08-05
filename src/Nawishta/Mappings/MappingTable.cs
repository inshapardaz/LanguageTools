namespace Nawishta.Mappings;

/// <summary>
/// Comprehensive character mapping table for Urdu Arabic, Romanised, and Hindi Devanagari scripts.
/// Covers consonants, vowels, diacritics, numerals, and punctuation.
/// </summary>
public static class MappingTable
{
    /// <summary>
    /// All character mappings between the three scripts.
    /// Roman arrays: first element is the canonical/preferred romanisation,
    /// subsequent elements are common alternatives that should be recognised during input.
    /// </summary>
    public static readonly CharacterMap[] AllMappings = BuildMappings();

    private static CharacterMap[] BuildMappings()
    {
        var list = new List<CharacterMap>();

        // ===== CONSONANTS =====
        list.AddRange(Consonants());

        // ===== VOWELS (independent forms) =====
        list.AddRange(Vowels());

        // ===== DIACRITICS / VOWEL MARKS =====
        list.AddRange(Diacritics());

        // ===== NUMERALS =====
        list.AddRange(Numerals());

        // ===== PUNCTUATION & SPECIAL =====
        list.AddRange(Punctuation());

        return list.ToArray();
    }

    private static IEnumerable<CharacterMap> Consonants()
    {
        return new[]
        {
            // Alif family
            new CharacterMap { Roman = ["a", "aa"], Urdu = "\u0627", Hindi = "\u0905", IsVowel = true, Category = "vowel" }, // ا / अ
            new CharacterMap { Roman = ["aa", "a"], Urdu = "\u0622", Hindi = "\u0906", IsVowel = true, Category = "vowel" }, // آ / आ (alif madda)

            // Ba series
            new CharacterMap { Roman = ["b"], Urdu = "\u0628", Hindi = "\u092C", Category = "consonant" }, // ب / ब
            new CharacterMap { Roman = ["p"], Urdu = "\u067E", Hindi = "\u092A", Category = "consonant" }, // پ / प

            // Ta series
            new CharacterMap { Roman = ["t"], Urdu = "\u062A", Hindi = "\u0924", Category = "consonant" }, // ت / त
            new CharacterMap { Roman = ["tt", "T"], Urdu = "\u0679", Hindi = "\u091F", Category = "consonant" }, // ٹ / ट (retroflex)

            // Tha/Sa series
            new CharacterMap { Roman = ["th", "s"], Urdu = "\u062B", Hindi = "\u0925", Category = "consonant" }, // ث / थ

            // Jeem series
            new CharacterMap { Roman = ["j"], Urdu = "\u062C", Hindi = "\u091C", Category = "consonant" }, // ج / ज
            new CharacterMap { Roman = ["ch"], Urdu = "\u0686", Hindi = "\u091A", Category = "consonant" }, // چ / च

            // Ha series (guttural)
            new CharacterMap { Roman = ["H", "h"], Urdu = "\u062D", Hindi = "\u0939", Category = "consonant" }, // ح / ह (Note: context-sensitive)

            // Kha series
            new CharacterMap { Roman = ["kh"], Urdu = "\u062E", Hindi = "\u0916", Category = "consonant" }, // خ / ख

            // Dal series
            new CharacterMap { Roman = ["d"], Urdu = "\u062F", Hindi = "\u0926", Category = "consonant" }, // د / द
            new CharacterMap { Roman = ["dd", "D"], Urdu = "\u0688", Hindi = "\u0921", Category = "consonant" }, // ڈ / ड (retroflex)

            // Zal
            new CharacterMap { Roman = ["z", "dh"], Urdu = "\u0630", Hindi = "\u0927", Category = "consonant" }, // ذ / ध

            // Ra series
            new CharacterMap { Roman = ["r"], Urdu = "\u0631", Hindi = "\u0930", Category = "consonant" }, // ر / र
            new CharacterMap { Roman = ["rr", "R"], Urdu = "\u0691", Hindi = "\u0921\u093C", Category = "consonant" }, // ڑ / ड़ (retroflex flap)

            // Za/Zay
            new CharacterMap { Roman = ["z"], Urdu = "\u0632", Hindi = "\u091C\u093C", Category = "consonant" }, // ز / ज़
            new CharacterMap { Roman = ["zh", "x"], Urdu = "\u0698", Hindi = "\u091C\u093C", Category = "consonant" }, // ژ / ज़

            // Seen/Sheen
            new CharacterMap { Roman = ["s"], Urdu = "\u0633", Hindi = "\u0938", Category = "consonant" }, // س / स
            new CharacterMap { Roman = ["sh"], Urdu = "\u0634", Hindi = "\u0936", Category = "consonant" }, // ش / श

            // Swad/Dwad
            new CharacterMap { Roman = ["sw", "s"], Urdu = "\u0635", Hindi = "\u0938", Category = "consonant" }, // ص / स
            new CharacterMap { Roman = ["dw", "z"], Urdu = "\u0636", Hindi = "\u091C\u093C", Category = "consonant" }, // ض / ज़

            // Toy/Zoy (emphatic)
            new CharacterMap { Roman = ["t", "tw"], Urdu = "\u0637", Hindi = "\u0924", Category = "consonant" }, // ط / त
            new CharacterMap { Roman = ["z", "zw"], Urdu = "\u0638", Hindi = "\u091C\u093C", Category = "consonant" }, // ظ / ज़

            // Ain/Ghain
            new CharacterMap { Roman = ["a", "'"], Urdu = "\u0639", Hindi = "\u0905", Category = "consonant" }, // ع / अ
            new CharacterMap { Roman = ["gh"], Urdu = "\u063A", Hindi = "\u0917\u093C", Category = "consonant" }, // غ / ग़

            // Fa/Qaf
            new CharacterMap { Roman = ["f"], Urdu = "\u0641", Hindi = "\u092B", Category = "consonant" }, // ف / फ
            new CharacterMap { Roman = ["q"], Urdu = "\u0642", Hindi = "\u0915\u093C", Category = "consonant" }, // ق / क़

            // Kaf/Gaf
            new CharacterMap { Roman = ["k"], Urdu = "\u06A9", Hindi = "\u0915", Category = "consonant" }, // ک / क
            new CharacterMap { Roman = ["g"], Urdu = "\u06AF", Hindi = "\u0917", Category = "consonant" }, // گ / ग

            // Lam/Meem/Noon
            new CharacterMap { Roman = ["l"], Urdu = "\u0644", Hindi = "\u0932", Category = "consonant" }, // ل / ल
            new CharacterMap { Roman = ["m"], Urdu = "\u0645", Hindi = "\u092E", Category = "consonant" }, // م / म
            new CharacterMap { Roman = ["n"], Urdu = "\u0646", Hindi = "\u0928", Category = "consonant" }, // ن / न
            new CharacterMap { Roman = ["N", "nn"], Urdu = "\u06BA", Hindi = "\u0901", Category = "consonant" }, // ں / ँ (noon ghunna / chandrabindu)

            // Waw/Ha/Ya
            new CharacterMap { Roman = ["w", "v"], Urdu = "\u0648", Hindi = "\u0935", Category = "consonant" }, // و / व
            new CharacterMap { Roman = ["h"], Urdu = "\u06BE", Hindi = "\u0939", Category = "consonant" }, // ھ / ह (do-chashmi he)
            new CharacterMap { Roman = ["y"], Urdu = "\u06CC", Hindi = "\u092F", Category = "consonant" }, // ی / य

            // Hamza
            new CharacterMap { Roman = ["'", ""], Urdu = "\u0621", Hindi = "\u0905", Category = "consonant" }, // ء / अ

            // Chooti he (at end of words)
            new CharacterMap { Roman = ["h", "a"], Urdu = "\u06C1", Hindi = "\u0939", Category = "consonant" }, // ہ / ह

            // Bari ye
            new CharacterMap { Roman = ["e", "ay"], Urdu = "\u06D2", Hindi = "\u090F", IsVowel = true, Category = "vowel" }, // ے / ए
        };
    }

    private static IEnumerable<CharacterMap> Vowels()
    {
        return new[]
        {
            // Independent vowel forms
            new CharacterMap { Roman = ["i"], Urdu = "\u0627\u0650", Hindi = "\u0907", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // اِ / इ
            new CharacterMap { Roman = ["ee", "i"], Urdu = "\u0627\u06CC", Hindi = "\u0908", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // ای / ई
            new CharacterMap { Roman = ["u"], Urdu = "\u0627\u064F", Hindi = "\u0909", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // اُ / उ
            new CharacterMap { Roman = ["oo", "u"], Urdu = "\u0627\u0648", Hindi = "\u090A", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // او / ऊ
            new CharacterMap { Roman = ["o"], Urdu = "\u0627\u0648", Hindi = "\u0913", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // او / ओ
            new CharacterMap { Roman = ["ai", "ay"], Urdu = "\u0627\u06CC", Hindi = "\u0910", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // ای / ऐ
            new CharacterMap { Roman = ["au", "aw"], Urdu = "\u0627\u0648", Hindi = "\u0914", IsVowel = true, IsDiacritic = false, Category = "vowel" }, // او / औ
        };
    }

    private static IEnumerable<CharacterMap> Diacritics()
    {
        return new[]
        {
            // Zabar (fatha) / अ matra (inherent in Devanagari)
            new CharacterMap { Roman = ["a"], Urdu = "\u064E", Hindi = "", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // َ

            // Zer (kasra) / इ matra
            new CharacterMap { Roman = ["i"], Urdu = "\u0650", Hindi = "\u093F", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ِ / ि

            // Pesh (damma) / उ matra
            new CharacterMap { Roman = ["u"], Urdu = "\u064F", Hindi = "\u0941", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ُ / ु

            // Long vowel matras
            new CharacterMap { Roman = ["aa"], Urdu = "\u064E\u0627", Hindi = "\u093E", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ا + zabar / ा
            new CharacterMap { Roman = ["ee", "ii"], Urdu = "\u0650\u06CC", Hindi = "\u0940", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ی + zer / ी
            new CharacterMap { Roman = ["oo", "uu"], Urdu = "\u064F\u0648", Hindi = "\u0942", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // و + pesh / ू
            new CharacterMap { Roman = ["e", "ay"], Urdu = "\u06D2", Hindi = "\u0947", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ے / े
            new CharacterMap { Roman = ["ai"], Urdu = "\u064E\u06CC", Hindi = "\u0948", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // ي + zabar / ै
            new CharacterMap { Roman = ["o"], Urdu = "\u064F\u0648", Hindi = "\u094B", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // و + pesh / ो
            new CharacterMap { Roman = ["au", "aw"], Urdu = "\u064E\u0648", Hindi = "\u094C", IsVowel = true, IsDiacritic = true, Category = "diacritic" }, // و + zabar / ौ

            // Shadda (tashdeed) / doubled consonant
            new CharacterMap { Roman = [""], Urdu = "\u0651", Hindi = "\u094D", IsDiacritic = true, Category = "diacritic" }, // ّ / ् (virama)

            // Sukun / Halant (virama)
            new CharacterMap { Roman = [""], Urdu = "\u0652", Hindi = "\u094D", IsDiacritic = true, Category = "diacritic" }, // ْ / ्

            // Tanween
            new CharacterMap { Roman = ["an"], Urdu = "\u064B", Hindi = "\u0902", IsDiacritic = true, Category = "diacritic" }, // ً / ं
            new CharacterMap { Roman = ["in"], Urdu = "\u064D", Hindi = "\u0902", IsDiacritic = true, Category = "diacritic" }, // ٍ / ं
            new CharacterMap { Roman = ["un"], Urdu = "\u064C", Hindi = "\u0902", IsDiacritic = true, Category = "diacritic" }, // ٌ / ं
        };
    }

    private static IEnumerable<CharacterMap> Numerals()
    {
        return new[]
        {
            new CharacterMap { Roman = ["0"], Urdu = "\u06F0", Hindi = "\u0966", Category = "numeral" }, // ۰ / ०
            new CharacterMap { Roman = ["1"], Urdu = "\u06F1", Hindi = "\u0967", Category = "numeral" }, // ۱ / १
            new CharacterMap { Roman = ["2"], Urdu = "\u06F2", Hindi = "\u0968", Category = "numeral" }, // ۲ / २
            new CharacterMap { Roman = ["3"], Urdu = "\u06F3", Hindi = "\u0969", Category = "numeral" }, // ۳ / ३
            new CharacterMap { Roman = ["4"], Urdu = "\u06F4", Hindi = "\u096A", Category = "numeral" }, // ۴ / ४
            new CharacterMap { Roman = ["5"], Urdu = "\u06F5", Hindi = "\u096B", Category = "numeral" }, // ۵ / ५
            new CharacterMap { Roman = ["6"], Urdu = "\u06F6", Hindi = "\u096C", Category = "numeral" }, // ۶ / ६
            new CharacterMap { Roman = ["7"], Urdu = "\u06F7", Hindi = "\u096D", Category = "numeral" }, // ۷ / ७
            new CharacterMap { Roman = ["8"], Urdu = "\u06F8", Hindi = "\u096E", Category = "numeral" }, // ۸ / ८
            new CharacterMap { Roman = ["9"], Urdu = "\u06F9", Hindi = "\u096F", Category = "numeral" }, // ۹ / ९
        };
    }

    private static IEnumerable<CharacterMap> Punctuation()
    {
        return new[]
        {
            new CharacterMap { Roman = ["."], Urdu = "\u06D4", Hindi = "\u0964", Category = "punctuation" }, // ۔ / ।
            new CharacterMap { Roman = [","], Urdu = "\u060C", Hindi = ",", Category = "punctuation" }, // ،
            new CharacterMap { Roman = ["?"], Urdu = "\u061F", Hindi = "?", Category = "punctuation" }, // ؟
            new CharacterMap { Roman = [";"], Urdu = "\u061B", Hindi = ";", Category = "punctuation" }, // ؛
        };
    }
}
