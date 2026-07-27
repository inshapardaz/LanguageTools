namespace ScriptConverter.Tests;

public class RomanToUrduTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("salam", "\u0633\u0644\u0627\u0645")]           // salam → سلام
    [InlineData("pakistan", "\u067E\u0627\u06A9\u0633\u062A\u0627\u0646")] // pakistan → پاکستان
    [InlineData("khuda", "\u062E\u062F\u0627")]                 // khuda → خدا
    [InlineData("shukria", "\u0634\u06A9\u0631\u06CC\u06C1")]   // shukria → شکریہ
    [InlineData("dil", "\u062F\u0644")]                         // dil → دل
    [InlineData("ghar", "\u063A\u0627\u0631")]                  // ghar → غار
    [InlineData("raat", "\u0631\u0627\u062A")]                  // raat → رات
    [InlineData("chai", "\u0686\u0627\u0626\u06D2")]            // chai → چائے
    public void ShouldConvertCommonWords(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("kh", "\u062E")]   // خ
    [InlineData("gh", "\u063A")]   // غ
    [InlineData("ch", "\u0686")]   // چ
    [InlineData("sh", "\u0634")]   // ش
    [InlineData("th", "\u062B")]   // ث
    [InlineData("tt", "\u0679")]   // ٹ
    [InlineData("dd", "\u0688")]   // ڈ
    [InlineData("rr", "\u0691")]   // ڑ
    public void ShouldHandleDigraphs(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("1", "\u06F1")]
    [InlineData("2", "\u06F2")]
    [InlineData("123", "\u06F1\u06F2\u06F3")]
    public void ShouldConvertNumerals(string roman, string expectedUrdu)
    {
        var result = _transliterator.RomanToUrdu(roman);
        Assert.Equal(expectedUrdu, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.RomanToUrdu(""));
        Assert.Equal(string.Empty, _transliterator.RomanToUrdu(null!));
    }

    [Fact]
    public void ShouldPreserveSpaces()
    {
        var result = _transliterator.RomanToUrdu("salam dost");
        Assert.Contains(" ", result);
    }

    [Fact]
    public void WordInitialVowelShouldGetAlif()
    {
        // Word-initial "a" → alif
        var result = _transliterator.RomanToUrdu("ab");
        Assert.StartsWith("\u0627", result); // starts with ا
    }

    [Fact]
    public void LongVowelsShouldProduceFullLetters()
    {
        // "aa" at start → آ (alif madda)
        var result = _transliterator.RomanToUrdu("aam");
        Assert.StartsWith("\u0622", result); // آ
    }
}
