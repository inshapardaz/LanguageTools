using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ScriptConverter.NaturalDictionary.Models;

namespace ScriptConverter.NaturalDictionary.Storage.Entities;

/// <summary>
/// EF Core entity for a dictionary article (headword + definition).
/// </summary>
[Table("natural_dictionary_articles")]
public sealed class ArticleEntity
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public long Id { get; set; }

    [Required]
    [MaxLength(32)]
    public string DictionaryId { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Headword { get; set; } = string.Empty;

    /// <summary>
    /// Normalised lowercase headword for case-insensitive lookups.
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string HeadwordNormalised { get; set; } = string.Empty;

    [Required]
    public string Definition { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of alternate headwords, or null.
    /// </summary>
    public string? Alternates { get; set; }

    /// <summary>Navigation property to parent dictionary.</summary>
    [ForeignKey(nameof(DictionaryId))]
    public DictionaryInfoEntity? Dictionary { get; set; }

    public NaturalDictionaryArticle ToModel() => new()
    {
        Id = Id,
        DictionaryId = DictionaryId,
        Headword = Headword,
        Definition = Definition,
        Alternates = Alternates,
    };

    public static ArticleEntity FromModel(NaturalDictionaryArticle model) => new()
    {
        DictionaryId = model.DictionaryId,
        Headword = model.Headword,
        HeadwordNormalised = model.Headword.ToLowerInvariant().Trim(),
        Definition = model.Definition,
        Alternates = model.Alternates,
    };
}
