namespace MetropolBusiness.Domain.Entities;

/// <summary>Ortak alanlar (ARCHITECTURE §4: id uuid, created_at/updated_at timestamptz UTC).</summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
