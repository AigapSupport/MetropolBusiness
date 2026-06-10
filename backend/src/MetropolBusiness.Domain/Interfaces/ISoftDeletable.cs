namespace MetropolBusiness.Domain.Interfaces;

/// <summary>Soft-delete edilen entity'ler (CLAUDE.md kural 7: silmeler mümkünse soft-delete).</summary>
public interface ISoftDeletable
{
    DateTimeOffset? DeletedAt { get; set; }
}
