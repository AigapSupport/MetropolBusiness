namespace MetropolBusiness.Domain.Entities;

/// <summary>
/// Kritik işlem denetim kaydı (ARCHITECTURE §4.7 audit_logs, PANELS_SPEC B.8):
/// firma oluşturma/pasifleştirme, modül değişikliği, marka değişikliği, davet vb.
/// Metadata PII İÇERMEZ (CLAUDE.md kural 4). TenantId nullable: platform-geneli
/// olaylar tenant'sızdır; ITenantOwned UYGULANMAZ ve query filter YOKTUR —
/// erişim yalnızca PlatformAdmin policy'li uçtandır.
/// </summary>
public class AuditLog : BaseEntity
{
    /// <summary>İlgili firma; platform-geneli olayda null.</summary>
    public Guid? TenantId { get; set; }

    /// <summary>İşlemi yapan kullanıcı (platform/firma admin); sistem olayında null.</summary>
    public Guid? ActorId { get; set; }

    /// <summary>Eylem slug'ı: tenant_created / tenant_status_changed / module_updated ...</summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>Varlık tipi: tenant / module / tenant_admin ...</summary>
    public string Entity { get; set; } = string.Empty;

    public string EntityId { get; set; } = string.Empty;

    /// <summary>PII'siz ek bilgi (jsonb) — örn. eski/yeni durum.</summary>
    public string MetadataJson { get; set; } = "{}";
}
