namespace ScriptConverter.Tests;

public class UrduToRomanTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("\u0633\u0644\u0627\u0645", "slam")]       // سلام → slam
    [InlineData("\u067E\u0627\u06A9\u0633\u062A\u0627\u0646", "pakstan")] // پاکستان (no zer = no 'i')
    [InlineData("\u062F\u0644", "dl")]                     // دل → dl
    [InlineData("\u0634", "sh")]                           // ش
    [InlineData("\u0686", "ch")]                           // چ
    [InlineData("\u062E", "kh")]                           // خ
    [InlineData("\u063A", "gh")]                           // غ
    public void ShouldConvertUrduCharacters(string urdu, string expectedRoman)
    {
        var result = _transliterator.UrduToRoman(urdu);
        Assert.Equal(expectedRoman, result);
    }

    [Theory]
    [InlineData("\u06F0", "0")]
    [InlineData("\u06F1", "1")]
    [InlineData("\u06F9", "9")]
    [InlineData("\u06F1\u06F2\u06F3", "123")]
    public void ShouldConvertNumerals(string urdu, string expectedRoman)
    {
        var result = _transliterator.UrduToRoman(urdu);
        Assert.Equal(expectedRoman, result);
    }

    [Theory]
    [InlineData("\u06D4", ".")]    // ۔
    [InlineData("\u060C", ",")]    // ،
    [InlineData("\u061F", "?")]    // ؟
    public void ShouldConvertPunctuation(string urdu, string expectedRoman)
    {
        var result = _transliterator.UrduToRoman(urdu);
        Assert.Equal(expectedRoman, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.UrduToRoman(""));
    }
}
