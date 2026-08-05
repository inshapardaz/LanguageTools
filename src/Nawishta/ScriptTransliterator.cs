using Nawishta.Converters;
using Nawishta.Mappings;

namespace Nawishta;

/// <summary>
/// Main entry point for the Nawishta library.
/// Provides a clean API for converting text between Urdu (Arabic script),
/// Romanised Urdu/Hindi, and Hindi (Devanagari script).
/// 
/// All six conversion directions are supported:
/// - Roman → Urdu Arabic
/// - Urdu Arabic → Roman
/// - Roman → Hindi Devanagari
/// - Hindi Devanagari → Roman
/// - Urdu Arabic → Hindi Devanagari (direct)
/// - Hindi Devanagari → Urdu Arabic (direct)
/// </summary>
public sealed class ScriptTransliterator
{
    private readonly Lazy<RomanToUrduConverter> _romanToUrdu = new(() => new RomanToUrduConverter());
    private readonly Lazy<UrduToRomanConverter> _urduToRoman = new(() => new UrduToRomanConverter());
    private readonly Lazy<RomanToHindiConverter> _romanToHindi = new(() => new RomanToHindiConverter());
    private readonly Lazy<HindiToRomanConverter> _hindiToRoman = new(() => new HindiToRomanConverter());
    private readonly Lazy<UrduToHindiConverter> _urduToHindi = new(() => new UrduToHindiConverter());
    private readonly Lazy<HindiToUrduConverter> _hindiToUrdu = new(() => new HindiToUrduConverter());

    /// <summary>
    /// Shared singleton instance for convenience.
    /// Thread-safe and lazily initialised.
    /// </summary>
    public static ScriptTransliterator Instance { get; } = new();

    /// <summary>
    /// Converts text from one script to another.
    /// </summary>
    /// <param name="input">The text to convert.</param>
    /// <param name="from">The source script.</param>
    /// <param name="to">The target script.</param>
    /// <returns>The converted text.</returns>
    /// <exception cref="ArgumentException">Thrown when source and target scripts are the same.</exception>
    /// <exception cref="NotSupportedException">Thrown for unsupported conversion pairs.</exception>
    public string Convert(string input, Script from, Script to)
    {
        if (from == to)
            return input;

        var converter = GetConverter(from, to);
        return converter.Convert(input);
    }

    /// <summary>
    /// Converts Romanised Urdu text to Urdu Arabic script.
    /// </summary>
    /// <param name="input">Romanised Urdu text (e.g., "salam").</param>
    /// <returns>Urdu Arabic script (e.g., "سلام").</returns>
    public string RomanToUrdu(string input) => _romanToUrdu.Value.Convert(input);

    /// <summary>
    /// Converts Urdu Arabic script to Romanised form.
    /// </summary>
    /// <param name="input">Urdu Arabic text (e.g., "سلام").</param>
    /// <returns>Romanised form (e.g., "salam").</returns>
    public string UrduToRoman(string input) => _urduToRoman.Value.Convert(input);

    /// <summary>
    /// Converts Romanised Hindi text to Hindi Devanagari script.
    /// </summary>
    /// <param name="input">Romanised text (e.g., "namaste").</param>
    /// <returns>Hindi Devanagari text (e.g., "नमस्ते").</returns>
    public string RomanToHindi(string input) => _romanToHindi.Value.Convert(input);

    /// <summary>
    /// Converts Hindi Devanagari script to Romanised form.
    /// </summary>
    /// <param name="input">Hindi Devanagari text (e.g., "नमस्ते").</param>
    /// <returns>Romanised form (e.g., "namaste").</returns>
    public string HindiToRoman(string input) => _hindiToRoman.Value.Convert(input);

    /// <summary>
    /// Converts Urdu Arabic script directly to Hindi Devanagari.
    /// </summary>
    /// <param name="input">Urdu Arabic script text.</param>
    /// <returns>Hindi Devanagari text.</returns>
    public string UrduToHindi(string input) => _urduToHindi.Value.Convert(input);

    /// <summary>
    /// Converts Hindi Devanagari directly to Urdu Arabic script.
    /// </summary>
    /// <param name="input">Hindi Devanagari text.</param>
    /// <returns>Urdu Arabic script text.</returns>
    public string HindiToUrdu(string input) => _hindiToUrdu.Value.Convert(input);

    private IScriptConverter GetConverter(Script from, Script to)
    {
        return (from, to) switch
        {
            (Script.Roman, Script.UrduArabic) => _romanToUrdu.Value,
            (Script.UrduArabic, Script.Roman) => _urduToRoman.Value,
            (Script.Roman, Script.HindiDevanagari) => _romanToHindi.Value,
            (Script.HindiDevanagari, Script.Roman) => _hindiToRoman.Value,
            (Script.UrduArabic, Script.HindiDevanagari) => _urduToHindi.Value,
            (Script.HindiDevanagari, Script.UrduArabic) => _hindiToUrdu.Value,
            _ => throw new NotSupportedException($"Conversion from {from} to {to} is not supported.")
        };
    }
}
