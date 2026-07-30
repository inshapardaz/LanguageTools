using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Export;

/// <summary>
/// Interface for dictionary format exporters.
/// Each exporter writes dictionary files to a target directory.
/// </summary>
public interface IDictionaryExporter
{
    /// <summary>The export format this exporter produces.</summary>
    DictionaryFormat Format { get; }

    /// <summary>File extension for the primary output (used for single-file formats).</summary>
    string FileExtension { get; }

    /// <summary>
    /// Export dictionary articles to the specified directory.
    /// Returns the list of file paths created.
    /// </summary>
    Task<IReadOnlyList<string>> ExportAsync(
        NaturalDictionaryInfo info,
        IReadOnlyList<NaturalDictionaryArticle> articles,
        string outputDirectory,
        CancellationToken cancellationToken = default);
}
