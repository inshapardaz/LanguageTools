using Microsoft.EntityFrameworkCore;
using ScriptConverter.NaturalDictionary.Storage.Entities;

namespace ScriptConverter.NaturalDictionary.Storage;

/// <summary>
/// EF Core DbContext for the natural dictionary store.
/// Uses SQLite for storage of imported GoldenDict-compatible dictionaries.
/// </summary>
public class NaturalDictionaryDbContext : DbContext
{
    public NaturalDictionaryDbContext(DbContextOptions<NaturalDictionaryDbContext> options)
        : base(options)
    {
    }

    public DbSet<DictionaryInfoEntity> Dictionaries { get; set; } = null!;
    public DbSet<ArticleEntity> Articles { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DictionaryInfoEntity>(entity =>
        {
            entity.ToTable("natural_dictionaries");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Format).HasMaxLength(50);
            entity.Property(e => e.SourceLanguage).HasMaxLength(100);
            entity.Property(e => e.TargetLanguage).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(2000);
            entity.Property(e => e.OriginalFileName).HasMaxLength(500);

            entity.HasMany(e => e.Articles)
                .WithOne(a => a.Dictionary)
                .HasForeignKey(a => a.DictionaryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ArticleEntity>(entity =>
        {
            entity.ToTable("natural_dictionary_articles");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.DictionaryId).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Headword).HasMaxLength(500).IsRequired();
            entity.Property(e => e.HeadwordNormalised).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Pronunciation).HasMaxLength(500);
            entity.Property(e => e.SensesJson).IsRequired().HasColumnName("SensesJson");
            entity.Property(e => e.LinksJson).HasColumnName("LinksJson");
            entity.Property(e => e.RawDefinition).HasColumnName("RawDefinition");
            entity.Property(e => e.Alternates);

            // Indexes for fast lookups
            entity.HasIndex(e => e.HeadwordNormalised)
                .HasDatabaseName("IX_articles_headword_normalised");

            entity.HasIndex(e => e.DictionaryId)
                .HasDatabaseName("IX_articles_dictionary_id");

            // Composite index for lookup within specific dictionaries
            entity.HasIndex(e => new { e.DictionaryId, e.HeadwordNormalised })
                .HasDatabaseName("IX_articles_dict_headword");
        });
    }
}
