namespace ScriptConverter.Mappings;

/// <summary>
/// Indexed lookup maps between Urdu Arabic script and Roman transliteration.
/// These are designed for efficient bidirectional conversion.
/// </summary>
public static class UrduRomanMap
{
    /// <summary>
    /// Urdu character to canonical romanisation.
    /// Ordered by priority for longest-match lookups.
    /// </summary>
    public static readonly (string Urdu, string Roman)[] UrduToRomanEntries =
    [
        // Numerals
        ("\u06F0", "0"), ("\u06F1", "1"), ("\u06F2", "2"), ("\u06F3", "3"), ("\u06F4", "4"),
        ("\u06F5", "5"), ("\u06F6", "6"), ("\u06F7", "7"), ("\u06F8", "8"), ("\u06F9", "9"),

        // Punctuation
        ("\u06D4", "."), ("\u060C", ","), ("\u061F", "?"), ("\u061B", ";"),

        // Alif with madda (must come before plain alif)
        ("\u0622", "aa"),

        // Consonants (multi-char Urdu sequences first for longest match)
        ("\u0628", "b"),
        ("\u067E", "p"),
        ("\u062A", "t"),
        ("\u0679", "tt"),
        ("\u062B", "s"),
        ("\u062C", "j"),
        ("\u0686", "ch"),
        ("\u062D", "h"),
        ("\u062E", "kh"),
        ("\u062F", "d"),
        ("\u0688", "dd"),
        ("\u0630", "z"),
        ("\u0631", "r"),
        ("\u0691", "rr"),
        ("\u0632", "z"),
        ("\u0698", "zh"),
        ("\u0633", "s"),
        ("\u0634", "sh"),
        ("\u0635", "s"),
        ("\u0636", "z"),
        ("\u0637", "t"),
        ("\u0638", "z"),
        ("\u0639", "'"),
        ("\u063A", "gh"),
        ("\u0641", "f"),
        ("\u0642", "q"),
        ("\u06A9", "k"),
        ("\u06AF", "g"),
        ("\u0644", "l"),
        ("\u0645", "m"),
        ("\u0646", "n"),
        ("\u06BA", "N"),   // noon ghunna
        ("\u0648", "w"),
        ("\u06BE", "h"),   // do-chashmi he
        ("\u06CC", "y"),   // choti ye
        ("\u06D2", "e"),   // bari ye
        ("\u0621", "'"),   // hamza
        ("\u06C1", "h"),   // gol he (chooti he)
        ("\u06C3", "t"),   // te marbuta

        // Alif (must come after other alif variants)
        ("\u0627", "a"),

        // Diacritics
        ("\u064E", "a"),   // zabar (fatha)
        ("\u0650", "i"),   // zer (kasra)
        ("\u064F", "u"),   // pesh (damma)
        ("\u0651", ""),    // shadda (tashdeed) - doubles preceding consonant
        ("\u0652", ""),    // sukun - no vowel
        ("\u064B", "an"),  // tanween fatha
        ("\u064D", "in"),  // tanween kasra
        ("\u064C", "un"),  // tanween damma

        // Alif with hamza above/below
        ("\u0623", "a"),   // أ
        ("\u0625", "i"),   // إ

        // Waw with hamza
        ("\u0624", "o"),   // ؤ

        // Ye with hamza
        ("\u0626", "e"),   // ئ
    ];

    /// <summary>
    /// Roman to Urdu lookup entries. Multi-character Roman sequences listed first (longest match).
    /// </summary>
    public static readonly (string Roman, string Urdu)[] RomanToUrduEntries =
    [
        // Multi-character sequences first (longest match wins)
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
        ("aa", "\u0622"),   // آ
        ("ee", "\u06CC"),   // ی (long ee)
        ("oo", "\u0648"),   // و (long oo)
        ("ai", "\u06CC"),   // ی
        ("au", "\u0648"),   // و
        ("ay", "\u06D2"),   // ے

        // Single character mappings
        ("a", "\u0627"),    // ا
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
        ("i", "\u0627"),    // ا (short i represented with alif + zer in context)
        ("u", "\u0627"),    // ا (short u represented with alif + pesh in context)
        ("e", "\u06D2"),    // ے
        ("o", "\u0648"),    // و
        ("N", "\u06BA"),    // ں

        // Numerals
        ("0", "\u06F0"), ("1", "\u06F1"), ("2", "\u06F2"), ("3", "\u06F3"), ("4", "\u06F4"),
        ("5", "\u06F5"), ("6", "\u06F6"), ("7", "\u06F7"), ("8", "\u06F8"), ("9", "\u06F9"),

        // Punctuation
        (".", "\u06D4"), (",", "\u060C"), ("?", "\u061F"), (";", "\u061B"),
    ];
}
