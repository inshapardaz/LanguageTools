using Microsoft.EntityFrameworkCore;

namespace Nawishta.Dictionary;

/// <summary>
/// EF Core DbContext for the dictionary store.
/// Supports both SQLite and MySQL via provider configuration.
/// </summary>
public class DictionaryDbContext : DbContext
{
    public DictionaryDbContext(DbContextOptions<DictionaryDbContext> options)
        : base(options)
    {
    }

    public DbSet<DictionaryEntryEntity> DictionaryEntries { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DictionaryEntryEntity>(entity =>
        {
            entity.ToTable("dictionary_entries");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id)
                .HasMaxLength(32)
                .IsRequired();

            entity.Property(e => e.Roman)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(e => e.Urdu)
                .HasMaxLength(500);

            entity.Property(e => e.Hindi)
                .HasMaxLength(500);

            entity.Property(e => e.Meaning)
                .HasMaxLength(500);

            entity.Property(e => e.Category)
                .HasMaxLength(100);

            // Index on Roman for fast lookups
            entity.HasIndex(e => e.Roman).HasDatabaseName("IX_dictionary_roman");
            entity.HasIndex(e => e.Category).HasDatabaseName("IX_dictionary_category");
        });
    }
}
