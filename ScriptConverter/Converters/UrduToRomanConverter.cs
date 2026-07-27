using ScriptConverter.Mappings;

namespace ScriptConverter.Converters;

/// <summary>
/// Converts Urdu Arabic script text to Romanised form.
/// </summary>
public sealed class UrduToRomanConverter : IScriptConverter
{
    private readonly (string Source, string Target)[] _entries;

    public UrduToRomanConverter()
    {
        // Convert the mapping entries to source/target pairs and sort by longest source first
        var raw = UrduRomanMap.UrduToRomanEntries
            .Select(e => (Source: e.Urdu, Target: e.Roman))
            .ToArray();

        _entries = TransliterationEngine.SortByLongestFirst(raw);
    }

    /// <summary>
    /// Converts Urdu Arabic script text to its Romanised equivalent.
    /// </summary>
    /// <param name="input">Text in Urdu Arabic script.</param>
    /// <returns>Romanised representation of the input.</returns>
    public string Convert(string input)
    {
        return TransliterationEngine.Transliterate(input, _entries);
    }
}
