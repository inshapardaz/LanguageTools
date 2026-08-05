namespace Nawishta.Tests;

public class UrduToHindiTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("\u0628", "\u092C")]       // ب → ब
    [InlineData("\u067E", "\u092A")]       // پ → प
    [InlineData("\u062A", "\u0924")]       // ت → त
    [InlineData("\u062C", "\u091C")]       // ج → ज
    [InlineData("\u0686", "\u091A")]       // چ → च
    [InlineData("\u062F", "\u0926")]       // د → द
    [InlineData("\u0631", "\u0930")]       // ر → र
    [InlineData("\u0633", "\u0938")]       // س → स
    [InlineData("\u0634", "\u0936")]       // ش → श
    [InlineData("\u06A9", "\u0915")]       // ک → क
    [InlineData("\u06AF", "\u0917")]       // گ → ग
    [InlineData("\u0644", "\u0932")]       // ل → ल
    [InlineData("\u0645", "\u092E")]       // م → म
    [InlineData("\u0646", "\u0928")]       // ن → न
    public void ShouldConvertBasicConsonants(string urdu, string expectedHindi)
    {
        var result = _transliterator.UrduToHindi(urdu);
        Assert.Equal(expectedHindi, result);
    }

    [Theory]
    [InlineData("\u0679", "\u091F")]       // ٹ → ट
    [InlineData("\u0688", "\u0921")]       // ڈ → ड
    [InlineData("\u0691", "\u0921\u093C")] // ڑ → ड़
    public void ShouldConvertRetroflexConsonants(string urdu, string expectedHindi)
    {
        var result = _transliterator.UrduToHindi(urdu);
        Assert.Equal(expectedHindi, result);
    }

    [Theory]
    [InlineData("\u06F0", "\u0966")]   // ۰ → ०
    [InlineData("\u06F1", "\u0967")]   // ۱ → १
    [InlineData("\u06F5", "\u096B")]   // ۵ → ५
    [InlineData("\u06F9", "\u096F")]   // ۹ → ९
    public void ShouldConvertNumerals(string urdu, string expectedHindi)
    {
        var result = _transliterator.UrduToHindi(urdu);
        Assert.Equal(expectedHindi, result);
    }

    [Theory]
    [InlineData("\u0642", "\u0915\u093C")]       // ق → क़
    [InlineData("\u063A", "\u0917\u093C")]       // غ → ग़
    [InlineData("\u0641", "\u092B\u093C")]       // ف → फ़
    public void ShouldConvertArabicSpecificLetters(string urdu, string expectedHindi)
    {
        var result = _transliterator.UrduToHindi(urdu);
        Assert.Equal(expectedHindi, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.UrduToHindi(""));
    }
}
