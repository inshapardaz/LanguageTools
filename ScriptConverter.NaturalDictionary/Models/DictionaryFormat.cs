namespace ScriptConverter.NaturalDictionary.Models;

/// <summary>
/// Supported dictionary source formats compatible with GoldenDict.
/// </summary>
public enum DictionaryFormat
{
    /// <summary>StarDict format (.ifo + .idx + .dict or .dict.dz)</summary>
    StarDict,

    /// <summary>ABBYY Lingvo DSL format (.dsl or .dsl.dz)</summary>
    Dsl,

    /// <summary>Unknown or unsupported format.</summary>
    Unknown,
}
