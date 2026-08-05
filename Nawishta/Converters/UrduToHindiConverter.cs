using Nawishta.Mappings;

namespace Nawishta.Converters;

/// <summary>
/// Converts Urdu Arabic script directly to Hindi Devanagari.
/// Since both languages share phonetics, this performs direct mapping
/// without going through romanisation as an intermediate.
/// </summary>
public sealed class UrduToHindiConverter : IScriptConverter
{
    private readonly (string Source, string Target)[] _entries;

    public UrduToHindiConverter()
    {
        var raw = UrduHindiMap.UrduToHindiEntries
            .Select(e => (Source: e.Urdu, Target: e.Hindi))
            .ToArray();

        _entries = TransliterationEngine.SortByLongestFirst(raw);
    }

    /// <summary>
    /// Converts Urdu Arabic script text directly to Hindi Devanagari.
    /// </summary>
    /// <param name="input">Text in Urdu Arabic script.</param>
    /// <returns>Hindi Devanagari representation.</returns>
    public string Convert(string input)
    {
        return TransliterationEngine.Transliterate(input, _entries);
    }
}
