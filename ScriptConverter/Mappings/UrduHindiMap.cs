namespace ScriptConverter.Mappings;

/// <summary>
/// Direct mapping between Urdu Arabic script and Hindi Devanagari script.
/// Since both languages share phonetics, this enables direct conversion without
/// going through romanisation as an intermediate step.
/// </summary>
public static class UrduHindiMap
{
    /// <summary>
    /// Direct Urdu to Hindi character mappings.
    /// Multi-character sequences listed first for longest match.
    /// </summary>
    public static readonly (string Urdu, string Hindi)[] UrduToHindiEntries =
    [
        // Numerals
        ("\u06F0", "\u0966"), ("\u06F1", "\u0967"), ("\u06F2", "\u0968"), ("\u06F3", "\u0969"), ("\u06F4", "\u096A"),
        ("\u06F5", "\u096B"), ("\u06F6", "\u096C"), ("\u06F7", "\u096D"), ("\u06F8", "\u096E"), ("\u06F9", "\u096F"),

        // Punctuation
        ("\u06D4", "\u0964"), ("\u060C", ","), ("\u061F", "?"), ("\u061B", ";"),

        // Alif with madda
        ("\u0622", "\u0906"),   // آ → आ

        // Consonants
        ("\u0628", "\u092C"),   // ب → ब
        ("\u067E", "\u092A"),   // پ → प
        ("\u062A", "\u0924"),   // ت → त
        ("\u0679", "\u091F"),   // ٹ → ट
        ("\u062B", "\u0925"),   // ث → थ
        ("\u062C", "\u091C"),   // ج → ज
        ("\u0686", "\u091A"),   // چ → च
        ("\u062D", "\u0939"),   // ح → ह
        ("\u062E", "\u0916"),   // خ → ख
        ("\u062F", "\u0926"),   // د → द
        ("\u0688", "\u0921"),   // ڈ → ड
        ("\u0630", "\u0927"),   // ذ → ध
        ("\u0631", "\u0930"),   // ر → र
        ("\u0691", "\u0921\u093C"), // ڑ → ड़
        ("\u0632", "\u091C\u093C"), // ز → ज़
        ("\u0698", "\u091C\u093C"), // ژ → ज़
        ("\u0633", "\u0938"),   // س → स
        ("\u0634", "\u0936"),   // ش → श
        ("\u0635", "\u0938"),   // ص → स
        ("\u0636", "\u091C\u093C"), // ض → ज़
        ("\u0637", "\u0924"),   // ط → त
        ("\u0638", "\u091C\u093C"), // ظ → ज़
        ("\u0639", "\u0905"),   // ع → अ
        ("\u063A", "\u0917\u093C"), // غ → ग़
        ("\u0641", "\u092B\u093C"), // ف → फ़
        ("\u0642", "\u0915\u093C"), // ق → क़
        ("\u06A9", "\u0915"),   // ک → क
        ("\u06AF", "\u0917"),   // گ → ग
        ("\u0644", "\u0932"),   // ل → ल
        ("\u0645", "\u092E"),   // م → म
        ("\u0646", "\u0928"),   // ن → न
        ("\u06BA", "\u0901"),   // ں → ँ (nasalisation)
        ("\u0648", "\u0935"),   // و → व (context-dependent: also ो, ू)
        ("\u06BE", "\u0939"),   // ھ → ह
        ("\u06CC", "\u092F"),   // ی → य (context-dependent: also ी, ि)
        ("\u06D2", "\u090F"),   // ے → ए
        ("\u0621", "\u0905"),   // ء → अ
        ("\u06C1", "\u0939"),   // ہ → ह
        ("\u06C3", "\u0924"),   // ة → त

        // Alif
        ("\u0627", "\u0905"),   // ا → अ

        // Diacritics
        ("\u064E", ""),         // zabar → inherent 'a' in Devanagari
        ("\u0650", "\u093F"),   // zer → ि
        ("\u064F", "\u0941"),   // pesh → ु
        ("\u0651", ""),         // shadda → double the consonant
        ("\u0652", "\u094D"),   // sukun → virama
        ("\u064B", "\u0902"),   // tanween fatha → anusvara
        ("\u064D", "\u0902"),   // tanween kasra → anusvara
        ("\u064C", "\u0902"),   // tanween damma → anusvara

        // Hamza variants
        ("\u0623", "\u0905"),   // أ → अ
        ("\u0625", "\u0907"),   // إ → इ
        ("\u0624", "\u0913"),   // ؤ → ओ
        ("\u0626", "\u090F"),   // ئ → ए
    ];

    /// <summary>
    /// Direct Hindi to Urdu character mappings.
    /// </summary>
    public static readonly (string Hindi, string Urdu)[] HindiToUrduEntries =
    [
        // Numerals
        ("\u0966", "\u06F0"), ("\u0967", "\u06F1"), ("\u0968", "\u06F2"), ("\u0969", "\u06F3"), ("\u096A", "\u06F4"),
        ("\u096B", "\u06F5"), ("\u096C", "\u06F6"), ("\u096D", "\u06F7"), ("\u096E", "\u06F8"), ("\u096F", "\u06F9"),

        // Punctuation
        ("\u0964", "\u06D4"),

        // Independent vowels
        ("\u0914", "\u0627\u0648"),  // औ → او
        ("\u0913", "\u0627\u0648"),  // ओ → او
        ("\u0910", "\u0627\u06CC"),  // ऐ → ای
        ("\u090F", "\u0627\u06D2"),  // ए → اے
        ("\u090A", "\u0627\u0648"),  // ऊ → او
        ("\u0909", "\u0627"),        // उ → ا (with pesh in context)
        ("\u0908", "\u0627\u06CC"),  // ई → ای
        ("\u0907", "\u0627"),        // इ → ا (with zer in context)
        ("\u0906", "\u0622"),        // आ → آ
        ("\u0905", "\u0627"),        // अ → ا

        // Consonants with nukta (must come before base)
        ("\u0915\u093C", "\u0642"),  // क़ → ق
        ("\u0916\u093C", "\u062E"),  // ख़ → خ
        ("\u0917\u093C", "\u063A"),  // ग़ → غ
        ("\u091C\u093C", "\u0632"),  // ज़ → ز
        ("\u0921\u093C", "\u0691"),  // ड़ → ڑ
        ("\u0922\u093C", "\u0691\u06BE"), // ढ़ → ڑھ
        ("\u092B\u093C", "\u0641"),  // फ़ → ف

        // Consonants
        ("\u0915", "\u06A9"),   // क → ک
        ("\u0916", "\u062E"),   // ख → خ
        ("\u0917", "\u06AF"),   // ग → گ
        ("\u0918", "\u063A"),   // घ → غ
        ("\u0919", "\u0646"),   // ङ → ن
        ("\u091A", "\u0686"),   // च → چ
        ("\u091B", "\u0686\u06BE"), // छ → چھ
        ("\u091C", "\u062C"),   // ज → ج
        ("\u091D", "\u062C\u06BE"), // झ → جھ
        ("\u091E", "\u0646"),   // ञ → ن
        ("\u091F", "\u0679"),   // ट → ٹ
        ("\u0920", "\u0679\u06BE"), // ठ → ٹھ
        ("\u0921", "\u0688"),   // ड → ڈ
        ("\u0922", "\u0688\u06BE"), // ढ → ڈھ
        ("\u0923", "\u0646"),   // ण → ن
        ("\u0924", "\u062A"),   // त → ت
        ("\u0925", "\u062A\u06BE"), // थ → تھ
        ("\u0926", "\u062F"),   // द → د
        ("\u0927", "\u062F\u06BE"), // ध → دھ
        ("\u0928", "\u0646"),   // न → ن
        ("\u092A", "\u067E"),   // प → پ
        ("\u092B", "\u067E\u06BE"), // फ → پھ
        ("\u092C", "\u0628"),   // ब → ب
        ("\u092D", "\u0628\u06BE"), // भ → بھ
        ("\u092E", "\u0645"),   // म → م
        ("\u092F", "\u06CC"),   // य → ی
        ("\u0930", "\u0631"),   // र → ر
        ("\u0932", "\u0644"),   // ल → ل
        ("\u0935", "\u0648"),   // व → و
        ("\u0936", "\u0634"),   // श → ش
        ("\u0937", "\u0634"),   // ष → ش
        ("\u0938", "\u0633"),   // स → س
        ("\u0939", "\u06C1"),   // ह → ہ

        // Vowel signs (matras)
        ("\u094C", "\u064E\u0648"),  // ौ → (zabar + waw)
        ("\u094B", "\u064F\u0648"),  // ो → (pesh + waw)
        ("\u0948", "\u064E\u06CC"),  // ै → (zabar + ye)
        ("\u0947", "\u06D2"),        // े → ے
        ("\u0942", "\u064F\u0648"),  // ू → (pesh + waw)
        ("\u0941", "\u064F"),        // ु → pesh
        ("\u0940", "\u0650\u06CC"),  // ी → (zer + ye)
        ("\u093F", "\u0650"),        // ि → zer
        ("\u093E", "\u064E\u0627"),  // ा → (zabar + alif)

        // Special signs
        ("\u094D", "\u0652"),   // virama → sukun
        ("\u0902", "\u06BA"),   // anusvara → noon ghunna
        ("\u0901", "\u06BA"),   // chandrabindu → noon ghunna
        ("\u0903", "\u06C1"),   // visarga → he
    ];
}
