using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Storage.Entities;

/// <summary>
/// EF Core entity for dictionary metadata.
/// </summary>
[Table("natural_dictionaries")]
public sealed class DictionaryInfoEntity
{
    [Key]
    [MaxLength(32)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Format { get; set; } = string.Empty;

    public int EntryCount { get; set; }

    [MaxLength(100)]
    public string? SourceLanguage { get; set; }

    [MaxLength(100)]
    public string? TargetLanguage { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? OriginalFileName { get; set; }

    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Navigation property to articles.</summary>
    public ICollection<ArticleEntity> Articles { get; set; } = new List<ArticleEntity>();

    public NaturalDictionaryInfo ToModel() => new()
    {
        Id = Id,
        Name = Name,
        Format = Enum.TryParse<DictionaryFormat>(Format, true, out var fmt) ? fmt : DictionaryFormat.Unknown,
        EntryCount = EntryCount,
        SourceLanguage = SourceLanguage,
        TargetLanguage = TargetLanguage,
        Description = Description,
        OriginalFileName = OriginalFileName,
        ImportedAt = ImportedAt,
    };

    public static DictionaryInfoEntity FromModel(NaturalDictionaryInfo model) => new()
    {
        Id = model.Id,
        Name = model.Name,
        Format = model.Format.ToString(),
        EntryCount = model.EntryCount,
        SourceLanguage = model.SourceLanguage,
        TargetLanguage = model.TargetLanguage,
        Description = model.Description,
        OriginalFileName = model.OriginalFileName,
        ImportedAt = model.ImportedAt,
    };
}
