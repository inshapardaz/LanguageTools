namespace Nawishta.Tests;

public class HindiToRomanTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("\u0915", "k")]       // क
    [InlineData("\u0916", "kh")]      // ख
    [InlineData("\u0917", "g")]       // ग
    [InlineData("\u0918", "gh")]      // घ
    [InlineData("\u091A", "ch")]      // च
    [InlineData("\u091C", "j")]       // ज
    [InlineData("\u091F", "tt")]      // ट
    [InlineData("\u0924", "t")]       // त
    [InlineData("\u0925", "th")]      // थ
    [InlineData("\u0926", "d")]       // द
    [InlineData("\u0927", "dh")]      // ध
    [InlineData("\u0928", "n")]       // न
    [InlineData("\u092A", "p")]       // प
    [InlineData("\u092B", "ph")]      // फ
    [InlineData("\u092C", "b")]       // ब
    [InlineData("\u092D", "bh")]      // भ
    [InlineData("\u092E", "m")]       // म
    [InlineData("\u0930", "r")]       // र
    [InlineData("\u0932", "l")]       // ल
    [InlineData("\u0936", "sh")]      // श
    [InlineData("\u0938", "s")]       // स
    [InlineData("\u0939", "h")]       // ह
    public void ShouldConvertSingleConsonants(string hindi, string expectedRoman)
    {
        var result = _transliterator.HindiToRoman(hindi);
        Assert.Equal(expectedRoman, result);
    }

    [Theory]
    [InlineData("\u0905", "a")]       // अ
    [InlineData("\u0906", "aa")]      // आ
    [InlineData("\u0907", "i")]       // इ
    [InlineData("\u0908", "ee")]      // ई
    [InlineData("\u0909", "u")]       // उ
    [InlineData("\u090A", "oo")]      // ऊ
    [InlineData("\u090F", "e")]       // ए
    [InlineData("\u0910", "ai")]      // ऐ
    [InlineData("\u0913", "o")]       // ओ
    [InlineData("\u0914", "au")]      // औ
    public void ShouldConvertIndependentVowels(string hindi, string expectedRoman)
    {
        var result = _transliterator.HindiToRoman(hindi);
        Assert.Equal(expectedRoman, result);
    }

    [Theory]
    [InlineData("\u0966", "0")]
    [InlineData("\u0967", "1")]
    [InlineData("\u096F", "9")]
    public void ShouldConvertNumerals(string hindi, string expectedRoman)
    {
        var result = _transliterator.HindiToRoman(hindi);
        Assert.Equal(expectedRoman, result);
    }

    [Theory]
    [InlineData("\u0915\u094D\u0930", "kr")]   // क्र (virama suppresses inherent a)
    public void ShouldHandleVirama(string hindi, string expectedRoman)
    {
        var result = _transliterator.HindiToRoman(hindi);
        Assert.Equal(expectedRoman, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.HindiToRoman(""));
    }
}
