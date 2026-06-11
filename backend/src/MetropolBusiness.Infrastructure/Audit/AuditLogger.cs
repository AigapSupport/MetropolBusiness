using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;

namespace MetropolBusiness.Infrastructure.Audit;

/// <summary>
/// audit_logs'a yazan implementasyon. Ayrı SaveChanges kullanır: denetim kaydı,
/// asıl işlemin transaction'ına bağlanmaz (v1 — asıl işlem başarısızsa çağıran
/// zaten log'lamaz; iki-aşamalı tutarlılık ihtiyacı doğarsa outbox'a taşınır).
/// </summary>
public sealed class AuditLogger(AppDbContext dbContext, ITenantContext tenantContext) : IAuditLogger
{
    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    public async Task LogAsync(
        string action, string entity, string entityId,
        object? metadata = null, Guid? tenantId = null,
        CancellationToken ct = default)
    {
        dbContext.AuditLogs.Add(new AuditLog
        {
            TenantId = tenantId,
            ActorId = tenantContext.UserId,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            MetadataJson = metadata is null ? "{}" : JsonSerializer.Serialize(metadata, JsonWeb),
        });

        await dbContext.SaveChangesAsync(ct);
    }
}
