namespace Nawishta.Tests;

public class HindiToUrduTests
{
    private readonly ScriptTransliterator _transliterator = ScriptTransliterator.Instance;

    [Theory]
    [InlineData("\u092C", "\u0628")]       // ब → ب
    [InlineData("\u092A", "\u067E")]       // प → پ
    [InlineData("\u0924", "\u062A")]       // त → ت
    [InlineData("\u091C", "\u062C")]       // ज → ج
    [InlineData("\u091A", "\u0686")]       // च → چ
    [InlineData("\u0926", "\u062F")]       // द → د
    [InlineData("\u0930", "\u0631")]       // र → ر
    [InlineData("\u0938", "\u0633")]       // स → س
    [InlineData("\u0936", "\u0634")]       // श → ش
    [InlineData("\u0915", "\u06A9")]       // क → ک
    [InlineData("\u0917", "\u06AF")]       // ग → گ
    [InlineData("\u0932", "\u0644")]       // ल → ل
    [InlineData("\u092E", "\u0645")]       // म → م
    [InlineData("\u0928", "\u0646")]       // न → ن
    public void ShouldConvertBasicConsonants(string hindi, string expectedUrdu)
    {
        var result = _transliterator.HindiToUrdu(hindi);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("\u091F", "\u0679")]       // ट → ٹ
    [InlineData("\u0921", "\u0688")]       // ड → ڈ
    [InlineData("\u0921\u093C", "\u0691")] // ड़ → ڑ
    public void ShouldConvertRetroflexConsonants(string hindi, string expectedUrdu)
    {
        var result = _transliterator.HindiToUrdu(hindi);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("\u0915\u093C", "\u0642")]       // क़ → ق
    [InlineData("\u0917\u093C", "\u063A")]       // ग़ → غ
    [InlineData("\u092B\u093C", "\u0641")]       // फ़ → ف
    [InlineData("\u091C\u093C", "\u0632")]       // ज़ → ز
    public void ShouldConvertNuktaConsonants(string hindi, string expectedUrdu)
    {
        var result = _transliterator.HindiToUrdu(hindi);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("\u0966", "\u06F0")]   // ० → ۰
    [InlineData("\u0967", "\u06F1")]   // १ → ۱
    [InlineData("\u096F", "\u06F9")]   // ९ → ۹
    public void ShouldConvertNumerals(string hindi, string expectedUrdu)
    {
        var result = _transliterator.HindiToUrdu(hindi);
        Assert.Equal(expectedUrdu, result);
    }

    [Theory]
    [InlineData("\u0916", "\u062E")]       // ख → خ
    [InlineData("\u0918", "\u063A")]       // घ → غ
    [InlineData("\u0925", "\u062A\u06BE")] // थ → تھ
    [InlineData("\u0927", "\u062F\u06BE")] // ध → دھ
    [InlineData("\u092D", "\u0628\u06BE")] // भ → بھ
    public void ShouldConvertAspiratedConsonants(string hindi, string expectedUrdu)
    {
        var result = _transliterator.HindiToUrdu(hindi);
        Assert.Equal(expectedUrdu, result);
    }

    [Fact]
    public void ShouldReturnEmptyForEmptyInput()
    {
        Assert.Equal(string.Empty, _transliterator.HindiToUrdu(""));
    }
}
