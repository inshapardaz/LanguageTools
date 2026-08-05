using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nawishta.Dictionary;

/// <summary>
/// EF Core entity for a dictionary entry stored in a database.
/// </summary>
[Table("dictionary_entries")]
public sealed class DictionaryEntryEntity
{
    [Key]
    [MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];

    [Required]
    [MaxLength(200)]
    public string Roman { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Urdu { get; set; }

    [MaxLength(500)]
    public string? Hindi { get; set; }

    [MaxLength(500)]
    public string? Meaning { get; set; }

    [MaxLength(100)]
    public string? Category { get; set; }

    /// <summary>Convert to the shared DictionaryEntry model.</summary>
    public DictionaryEntry ToDictionaryEntry() => new()
    {
        Id = Id,
        Roman = Roman,
        Urdu = Urdu,
        Hindi = Hindi,
        Meaning = Meaning,
        Category = Category,
    };

    /// <summary>Create entity from the shared DictionaryEntry model.</summary>
    public static DictionaryEntryEntity FromDictionaryEntry(DictionaryEntry entry) => new()
    {
        Id = string.IsNullOrWhiteSpace(entry.Id) ? Guid.NewGuid().ToString("N")[..8] : entry.Id,
        Roman = entry.Roman,
        Urdu = entry.Urdu,
        Hindi = entry.Hindi,
        Meaning = entry.Meaning,
        Category = entry.Category,
    };
}
