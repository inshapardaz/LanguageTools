namespace ScriptConverter.Tests;

public class RomanToHindiTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("k", "\u0915")]       // क
    [InlineData("kh", "\u0916")]      // ख
    [InlineData("g", "\u0917")]       // ग
    [InlineData("gh", "\u0918")]      // घ
    [InlineData("ch", "\u091A")]      // च
    [InlineData("j", "\u091C")]       // ज
    [InlineData("t", "\u0924")]       // त
    [InlineData("th", "\u0925")]      // थ
    [InlineData("d", "\u0926")]       // द
    [InlineData("dh", "\u0927")]      // ध
    [InlineData("n", "\u0928")]       // न
    [InlineData("p", "\u092A")]       // प
    [InlineData("b", "\u092C")]       // ब
    [InlineData("bh", "\u092D")]      // भ
    [InlineData("m", "\u092E")]       // म
    [InlineData("r", "\u0930")]       // र
    [InlineData("l", "\u0932")]       // ल
    [InlineData("sh", "\u0936")]      // श
    [InlineData("s", "\u0938")]       // स
    [InlineData("h", "\u0939")]       // ह
    public void ShouldConvertSingleConsonants(string roman, string expectedHindi)
    {
        var result = _transliterator.RomanToHindi(roman);
        Assert.Equal(expectedHindi, result);
    }

    [Theory]
    [InlineData("tt", "\u091F")]      // ट
    [InlineData("dd", "\u0921")]      // ड
    [InlineData("ph", "\u092B")]      // फ
    public void ShouldConvertRetroflexAndAspirates(string roman, string expectedHindi)
    {
        var result = _transliterator.RomanToHindi(roman);
        Assert.Equal(expectedHindi, result);
    }

    [Theory]
    [InlineData("0", "\u0966")]
    [InlineData("1", "\u0967")]
    [InlineData("9", "\u096F")]
    [InlineData("123", "\u0967\u0968\u0969")]
    public void ShouldConvertNumerals(string roman, string expectedHindi)
    {
        var result = _transliterator.RomanToHindi(roman);
        Assert.Equal(expectedHindi, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.RomanToHindi(""));
        Assert.Equal(string.Empty, _transliterator.RomanToHindi(null!));
    }

    [Fact]
    public void ShouldPreserveSpaces()
    {
        var result = _transliterator.RomanToHindi("ek do");
        Assert.Contains(" ", result);
    }
}
