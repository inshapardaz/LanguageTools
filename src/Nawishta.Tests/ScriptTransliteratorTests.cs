using Nawishta.Mappings;

namespace Nawishta.Tests;

/// <summary>
/// Tests for the generic Convert() API and edge cases.
/// </summary>
public class ScriptTransliteratorTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Fact]
    public void ConvertSameScriptReturnsSameText()
    {
        const string text = "hello";
        Assert.Equal(text, _transliterator.Convert(text, Script.Roman, Script.Roman));
    }

    [Theory]
    [InlineData(Script.Roman, Script.UrduArabic)]
    [InlineData(Script.Roman, Script.HindiDevanagari)]
    [InlineData(Script.UrduArabic, Script.Roman)]
    [InlineData(Script.UrduArabic, Script.HindiDevanagari)]
    [InlineData(Script.HindiDevanagari, Script.Roman)]
    [InlineData(Script.HindiDevanagari, Script.UrduArabic)]
    public void AllConversionDirectionsAreSupported(Script from, Script to)
    {
        // Should not throw
        var result = _transliterator.Convert("test", from, to);
        Assert.NotNull(result);
    }

    [Fact]
    public void ShouldHandleWhitespacePreservation()
    {
        var result = _transliterator.Convert("a b c", Script.Roman, Script.UrduArabic);
        Assert.Contains(" ", result);
    }

    [Fact]
    public void ShouldHandleMixedContent()
    {
        // English text that has no mapping entries passes through
        var result = _transliterator.UrduToRoman("Hello World");
        Assert.Equal("Hello World", result);
    }

    [Fact]
    public void InstanceIsSingleton()
    {
        var a = ScriptTransliterator.Instance;
        var b = ScriptTransliterator.Instance;
        Assert.Same(a, b);
    }

    [Fact]
    public void RomanToUrduAndBackShouldBeReasonable()
    {
        // Round-trip won't be exact due to ambiguity, but should produce valid output
        var urdu = _transliterator.RomanToUrdu("pakistan");
        Assert.NotEmpty(urdu);

        var backToRoman = _transliterator.UrduToRoman(urdu);
        Assert.NotEmpty(backToRoman);
    }

    [Fact]
    public void RomanToHindiAndBackShouldBeReasonable()
    {
        var hindi = _transliterator.RomanToHindi("bharat");
        Assert.NotEmpty(hindi);

        var backToRoman = _transliterator.HindiToRoman(hindi);
        Assert.NotEmpty(backToRoman);
    }
}
