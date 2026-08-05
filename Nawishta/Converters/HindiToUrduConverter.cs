using Nawishta.Mappings;

namespace Nawishta.Converters;

/// <summary>
/// Converts Hindi Devanagari script directly to Urdu Arabic script.
/// Since both languages share phonetics, this performs direct mapping
/// without going through romanisation as an intermediate.
/// </summary>
public sealed class HindiToUrduConverter : IScriptConverter
{
    private readonly (string Source, string Target)[] _entries;

    public HindiToUrduConverter()
    {
        var raw = UrduHindiMap.HindiToUrduEntries
            .Select(e => (Source: e.Hindi, Target: e.Urdu))
            .ToArray();

        _entries = TransliterationEngine.SortByLongestFirst(raw);
    }

    /// <summary>
    /// Converts Hindi Devanagari text directly to Urdu Arabic script.
    /// </summary>
    /// <param name="input">Text in Devanagari script.</param>
    /// <returns>Urdu Arabic script representation.</returns>
    public string Convert(string input)
    {
        return TransliterationEngine.Transliterate(input, _entries);
    }
}
