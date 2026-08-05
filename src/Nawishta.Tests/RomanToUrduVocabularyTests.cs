namespace Nawishta.Tests;

/// <summary>
/// Vocabulary-level tests for Roman to Urdu conversion.
/// Tests are based on common Urdu words and their standard romanised spellings.
/// 
/// IMPORTANT: Romanised Urdu is inherently ambiguous. The same Roman sound can map
/// to multiple Urdu characters:
///   - "s" → س (seen) or ص (swad) or ث (sa)
///   - "z" → ز (zay) or ض (dwad) or ظ (zoy)  
///   - "h" → ہ (he) or ح (ha) 
///   - "a" at word start → ا (alif) or ع (ain)
///   - "t" → ت (te) or ط (toy)
///
/// The converter maps to the MOST COMMON Urdu character for each sound.
/// Words with Arabic-origin characters (ع، ص، ض، ح، ط، ظ) require dictionary support.
/// 
/// Additionally, "kh" is ambiguous between خ (khay) and کھ (kaf + do-chashmi he),
/// "gh" between غ (ghain) and گھ (gaf + do-chashmi he), etc.
/// The converter defaults to the Arabic-origin letter for these digraphs.
/// </summary>
public class RomanToUrduVocabularyTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    // ===== Words that convert correctly =====

    [Theory]
    [InlineData("pakistan", "\u067E\u0627\u06A9\u0633\u062A\u0627\u0646")] // پاکستان
    [InlineData("salam", "\u0633\u0644\u0627\u0645")]       // سلام
    [InlineData("khuda", "\u062E\u062F\u0627")]             // خدا
    [InlineData("shukria", "\u0634\u06A9\u0631\u06CC\u06C1")] // شکریہ
    [InlineData("ghar", "\u063A\u0627\u0631")]              // غار
    [InlineData("chai", "\u0686\u0627\u0626\u06D2")]        // چائے
    [InlineData("dil", "\u062F\u0644")]                     // دل
    public void PreviouslyVerifiedWords(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    // ===== Basic vocabulary - simple unambiguous words =====

    [Theory]
    [InlineData("bura", "\u0628\u0631\u0627")]                    // برا (bad)
    [InlineData("do", "\u062F\u0648")]                            // دو (two)
    [InlineData("teen", "\u062A\u06CC\u0646")]                    // تین (three)
    [InlineData("ruko", "\u0631\u06A9\u0648")]                    // رکو (stop)
    [InlineData("kon", "\u06A9\u0648\u0646")]                     // کون (who)
    [InlineData("shandaar", "\u0634\u0627\u0646\u062F\u0627\u0631")] // شاندار (fabulous)
    [InlineData("pasand", "\u067E\u0633\u0646\u062F")]            // پسند (like)
    [InlineData("banana", "\u0628\u0646\u0627\u0646\u0627")]      // بنانا (to make)
    public void SimpleUnambiguousWords(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    // ===== Long vowels =====

    [Theory]
    [InlineData("aasan", "\u0622\u0633\u0627\u0646")]             // آسان (easy)
    [InlineData("aana", "\u0622\u0646\u0627")]                    // آنا (to come)
    [InlineData("aaj", "\u0622\u062C")]                           // آج (today)
    [InlineData("saal", "\u0633\u0627\u0644")]                    // سال (year)
    [InlineData("saat", "\u0633\u0627\u062A")]                    // سات (seven)
    [InlineData("chaar", "\u0686\u0627\u0631")]                   // چار (four)
    [InlineData("paanch", "\u067E\u0627\u0646\u0686")]            // پانچ (five)
    [InlineData("door", "\u062F\u0648\u0631")]                    // دور (far)
    public void LongVowelWords(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    // ===== Short vowels omitted =====

    [Theory]
    [InlineData("mushkil", "\u0645\u0634\u06A9\u0644")]           // مشکل (hard)
    [InlineData("tum", "\u062A\u0645")]                           // تم (you)
    [InlineData("hum", "\u06C1\u0645")]                           // ہم (we)
    public void ShortUVowelOmitted(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    // ===== Multi-word phrases =====

    [Fact]
    public void MultiWordPhrase_PreservesSpaces()
    {
        var result = _transliterator.RomanToUrdu("mein pasand karta hoon");
        Assert.NotEmpty(result);
        Assert.Contains(" ", result);
        var words = result.Split(' ');
        Assert.Equal(4, words.Length);
    }

    [Fact]
    public void MultiWordPhrase_EachWordConverted()
    {
        var result = _transliterator.RomanToUrdu("mein istemal karta hoon");
        Assert.NotEmpty(result);
        var words = result.Split(' ');
        Assert.Equal(4, words.Length);
        // Each word should contain Urdu characters
        foreach (var word in words)
        {
            Assert.True(word.Any(c => c >= '\u0600' && c <= '\u06FF'),
                $"Word did not produce Urdu characters: [{word}]");
        }
    }

    // ===== Comprehensive vocabulary - all words produce valid Urdu output =====

    [Theory]
    [InlineData("aasan")]
    [InlineData("mushkil")]
    [InlineData("acha")]
    [InlineData("bura")]
    [InlineData("nazdeek")]
    [InlineData("haan")]
    [InlineData("nae")]
    [InlineData("rakhna")]
    [InlineData("jana")]
    [InlineData("aana")]
    [InlineData("hansna")]
    [InlineData("banana")]
    [InlineData("chahna")]
    [InlineData("laina")]
    [InlineData("daikhna")]
    [InlineData("door")]
    [InlineData("chota")]
    [InlineData("barha")]
    [InlineData("khoobsoorat")]
    [InlineData("badsoorat")]
    [InlineData("mazaydar")]
    [InlineData("hafta")]
    [InlineData("saal")]
    [InlineData("aaj")]
    [InlineData("kal")]
    [InlineData("ghanta")]
    [InlineData("minet")]
    [InlineData("waqt")]
    [InlineData("peer")]
    [InlineData("mungal")]
    [InlineData("budh")]
    [InlineData("jumarat")]
    [InlineData("jumma")]
    [InlineData("itwar")]
    [InlineData("sifar")]
    [InlineData("aik")]
    [InlineData("do")]
    [InlineData("teen")]
    [InlineData("chaar")]
    [InlineData("paanch")]
    [InlineData("chhey")]
    [InlineData("saat")]
    [InlineData("aath")]
    [InlineData("no")]
    [InlineData("das")]
    [InlineData("mein")]
    [InlineData("tum")]
    [InlineData("wo")]
    [InlineData("hum")]
    [InlineData("kya")]
    [InlineData("kahan")]
    [InlineData("kon")]
    [InlineData("ruko")]
    [InlineData("ajeeb")]
    [InlineData("mutajassas")]
    [InlineData("khoobsurat")]
    [InlineData("aajiz")]
    [InlineData("badtameez")]
    [InlineData("wazeh")]
    [InlineData("shandaar")]
    [InlineData("hairat")]
    [InlineData("angaiz")]
    [InlineData("dilkash")]
    [InlineData("sasta")]
    [InlineData("deewana")]
    [InlineData("munfarid")]
    [InlineData("umeed")]
    public void AllVocabularyWordsProduceValidUrduOutput(string roman)
    {
        var result = _transliterator.RomanToUrdu(roman);

        Assert.False(string.IsNullOrEmpty(result),
            $"Word '{roman}' produced empty output");

        Assert.True(result.Any(c => c >= '\u0600' && c <= '\u06FF'),
            $"Word '{roman}' did not produce Urdu script characters: [{result}]");
    }

    // ===== Digits =====

    [Fact]
    public void ShouldHandleDigitsInContext()
    {
        var result = _transliterator.RomanToUrdu("3 din");
        Assert.StartsWith("\u06F3", result); // ۳
    }

    // ===== Converter behaviour documentation tests =====
    // These document current converter output for words where romanisation is ambiguous.
    // The "correct" Urdu would require dictionary-based disambiguation.

    [Theory]
    [InlineData("deewana", "\u062F\u06CC\u0648\u0627\u0646\u0627")]   // دیوانا (converter: final a→alif; ideal: دیوانہ)
    [InlineData("umeed", "\u0627\u0645\u06CC\u062F")]                  // امید (hope)
    public void ConverterOutput_CommonWordsWithLongVowels(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("nazdeek", "\u0646\u0627\u0632\u062F\u06CC\u06A9")]   // نازدیک (converter keeps 'a'; ideal: نزدیک)
    [InlineData("dilkash", "\u062F\u0644\u06A9\u0627\u0634")]         // دلکاش (converter keeps 'a'; ideal: دلکش)
    public void ConverterOutput_ShortAKeptAsAlif(string roman, string expectedUrdu)
    {
        // These words have short 'a' that in standard Urdu would be omitted,
        // but the converter keeps them as alif due to position rules.
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }
}
