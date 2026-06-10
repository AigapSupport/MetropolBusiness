namespace MetropolBusiness.Domain.Interfaces;

/// <summary>
/// Bir tenant'a (firmaya) ait her entity bu arayüzü uygular.
/// EF global query filter ve TenantId otomatik atama bu arayüz üzerinden çalışır
/// (CLAUDE.md kural 1: tenant izolasyonu kutsaldır).
/// </summary>
public interface ITenantOwned
{
    Guid TenantId { get; set; }
}
