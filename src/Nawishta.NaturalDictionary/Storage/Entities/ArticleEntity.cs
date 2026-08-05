using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using Nawishta.NaturalDictionary.Models;

namespace Nawishta.NaturalDictionary.Storage.Entities;

/// <summary>
/// EF Core entity for a dictionary article.
/// Complex structured fields (Senses, Links) are stored as JSON columns.
/// </summary>
[Table("natural_dictionary_articles")]
public sealed class ArticleEntity
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

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

    /// <summary>Phonetic/pronunciation guide.</summary>
    [MaxLength(500)]
    public string? Pronunciation { get; set; }

    /// <summary>
    /// JSON-serialised list of WordSense objects.
    /// </summary>
    [Required]
    public string SensesJson { get; set; } = "[]";

    /// <summary>
    /// JSON-serialised list of WordLink objects.
    /// </summary>
    public string? LinksJson { get; set; }

    /// <summary>
    /// Raw definition text (HTML/plain) from the original source for fallback display.
    /// </summary>
    public string? RawDefinition { get; set; }

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
        Pronunciation = Pronunciation,
        Senses = DeserializeSenses(SensesJson),
        Links = DeserializeLinks(LinksJson),
        RawDefinition = RawDefinition,
        Alternates = Alternates,
    };

    public static ArticleEntity FromModel(NaturalDictionaryArticle model) => new()
    {
        DictionaryId = model.DictionaryId,
        Headword = model.Headword,
        HeadwordNormalised = model.Headword.ToLowerInvariant().Trim(),
        Pronunciation = model.Pronunciation,
        SensesJson = SerializeSenses(model.Senses),
        LinksJson = SerializeLinks(model.Links),
        RawDefinition = model.RawDefinition,
        Alternates = model.Alternates,
    };

    private static string SerializeSenses(List<WordSense>? senses)
    {
        if (senses == null || senses.Count == 0)
            return "[]";
        return JsonSerializer.Serialize(senses, JsonOpts);
    }

    private static List<WordSense> DeserializeSenses(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<WordSense>>(json, JsonOpts) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string? SerializeLinks(List<WordLink>? links)
    {
        if (links == null || links.Count == 0)
            return null;
        return JsonSerializer.Serialize(links, JsonOpts);
    }

    private static List<WordLink> DeserializeLinks(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<WordLink>>(json, JsonOpts) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
