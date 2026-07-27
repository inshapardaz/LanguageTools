namespace ScriptConverter.Mappings;

/// <summary>
/// Indexed lookup maps between Hindi Devanagari script and Roman transliteration.
/// </summary>
public static class HindiRomanMap
{
    /// <summary>
    /// Devanagari to canonical romanisation.
    /// Multi-character Devanagari sequences listed first for longest match.
    /// </summary>
    public static readonly (string Hindi, string Roman)[] HindiToRomanEntries =
    [
        // Numerals
        ("\u0966", "0"), ("\u0967", "1"), ("\u0968", "2"), ("\u0969", "3"), ("\u096A", "4"),
        ("\u096B", "5"), ("\u096C", "6"), ("\u096D", "7"), ("\u096E", "8"), ("\u096F", "9"),

        // Punctuation
        ("\u0964", "."),   // purna viram

        // Independent vowels
        ("\u0914", "au"),  // औ (must come before ओ)
        ("\u0913", "o"),   // ओ
        ("\u0910", "ai"),  // ऐ (must come before ए)
        ("\u090F", "e"),   // ए
        ("\u090A", "oo"),  // ऊ
        ("\u0909", "u"),   // उ
        ("\u0908", "ee"),  // ई
        ("\u0907", "i"),   // इ
        ("\u0906", "aa"),  // आ
        ("\u0905", "a"),   // अ

        // Consonants with nukta (must come before base consonants)
        ("\u0915\u093C", "q"),   // क़
        ("\u0916\u093C", "kh"),  // ख़
        ("\u0917\u093C", "gh"),  // ग़
        ("\u091C\u093C", "z"),   // ज़
        ("\u0921\u093C", "rr"),  // ड़
        ("\u0922\u093C", "rrh"), // ढ़
        ("\u092B\u093C", "f"),   // फ़

        // Consonants
        ("\u0915", "k"),   // क
        ("\u0916", "kh"),  // ख
        ("\u0917", "g"),   // ग
        ("\u0918", "gh"),  // घ
        ("\u0919", "ng"),  // ङ
        ("\u091A", "ch"),  // च
        ("\u091B", "chh"), // छ
        ("\u091C", "j"),   // ज
        ("\u091D", "jh"),  // झ
        ("\u091E", "ny"),  // ञ
        ("\u091F", "tt"),  // ट
        ("\u0920", "tth"), // ठ
        ("\u0921", "dd"),  // ड
        ("\u0922", "ddh"), // ढ
        ("\u0923", "N"),   // ण
        ("\u0924", "t"),   // त
        ("\u0925", "th"),  // थ
        ("\u0926", "d"),   // द
        ("\u0927", "dh"),  // ध
        ("\u0928", "n"),   // न
        ("\u092A", "p"),   // प
        ("\u092B", "ph"),  // फ
        ("\u092C", "b"),   // ब
        ("\u092D", "bh"),  // भ
        ("\u092E", "m"),   // म
        ("\u092F", "y"),   // य
        ("\u0930", "r"),   // र
        ("\u0932", "l"),   // ल
        ("\u0935", "v"),   // व
        ("\u0936", "sh"),  // श
        ("\u0937", "sh"),  // ष (also sh in romanised form)
        ("\u0938", "s"),   // स
        ("\u0939", "h"),   // ह

        // Vowel signs (matras)
        ("\u094C", "au"),  // ौ
        ("\u094B", "o"),   // ो
        ("\u0948", "ai"),  // ै
        ("\u0947", "e"),   // े
        ("\u0942", "oo"),  // ू
        ("\u0941", "u"),   // ु
        ("\u0940", "ee"),  // ी
        ("\u093F", "i"),   // ि
        ("\u093E", "aa"),  // ा

        // Special signs
        ("\u094D", ""),    // virama (halant) - suppresses inherent 'a'
        ("\u0902", "n"),   // anusvara ं
        ("\u0901", "N"),   // chandrabindu ँ
        ("\u0903", "h"),   // visarga ः
    ];

    /// <summary>
    /// Roman to Devanagari lookup entries. Multi-character Roman sequences listed first.
    /// </summary>
    public static readonly (string Roman, string Hindi)[] RomanToHindiEntries =
    [
        // Multi-character sequences (longest match first)
        ("kh", "\u0916"),   // ख
        ("gh", "\u0918"),   // घ
        ("ng", "\u0919"),   // ङ
        ("ch", "\u091A"),   // च
        ("chh", "\u091B"),  // छ
        ("jh", "\u091D"),   // झ
        ("ny", "\u091E"),   // ञ
        ("tt", "\u091F"),   // ट
        ("tth", "\u0920"),  // ठ
        ("dd", "\u0921"),   // ड
        ("ddh", "\u0922"),  // ढ
        ("th", "\u0925"),   // थ
        ("dh", "\u0927"),   // ध
        ("ph", "\u092B"),   // फ
        ("bh", "\u092D"),   // भ
        ("sh", "\u0936"),   // श
        ("zh", "\u091C\u093C"), // ज़
        ("rr", "\u0921\u093C"), // ड़
        ("aa", "\u093E"),   // ा (matra - used after consonant)
        ("ee", "\u0940"),   // ी
        ("oo", "\u0942"),   // ू
        ("ai", "\u0948"),   // ै
        ("au", "\u094C"),   // ौ
        ("ay", "\u0947"),   // े

        // Single character mappings
        ("k", "\u0915"),    // क
        ("g", "\u0917"),    // ग
        ("c", "\u091A"),    // च
        ("j", "\u091C"),    // ज
        ("t", "\u0924"),    // त
        ("d", "\u0926"),    // द
        ("n", "\u0928"),    // न
        ("p", "\u092A"),    // प
        ("f", "\u092B\u093C"), // फ़
        ("b", "\u092C"),    // ब
        ("m", "\u092E"),    // म
        ("y", "\u092F"),    // य
        ("r", "\u0930"),    // र
        ("l", "\u0932"),    // ल
        ("v", "\u0935"),    // व
        ("w", "\u0935"),    // व
        ("s", "\u0938"),    // स
        ("h", "\u0939"),    // ह
        ("q", "\u0915\u093C"), // क़
        ("z", "\u091C\u093C"), // ज़
        ("N", "\u0923"),    // ण

        // Vowels (independent forms - used at word start)
        ("a", "\u0905"),    // अ
        ("i", "\u093F"),    // ि (matra form after consonant)
        ("u", "\u0941"),    // ु (matra form after consonant)
        ("e", "\u0947"),    // े (matra form after consonant)
        ("o", "\u094B"),    // ो (matra form after consonant)

        // Numerals
        ("0", "\u0966"), ("1", "\u0967"), ("2", "\u0968"), ("3", "\u0969"), ("4", "\u096A"),
        ("5", "\u096B"), ("6", "\u096C"), ("7", "\u096D"), ("8", "\u096E"), ("9", "\u096F"),
    ];
}
