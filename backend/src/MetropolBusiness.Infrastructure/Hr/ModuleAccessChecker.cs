using MetropolBusiness.Application.Hr;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Hr;

/// <summary>
/// Üç seviyeli kontrol zincirinin son halkası (PANELS_SPEC §C): kullanıcının
/// segmentleri → segment_modules → AKTİF modül kodu. Query filter'lar tenant
/// izolasyonunu zaten zorlar (user_segments/segment_modules ebeveyn üzerinden filtreli).
/// </summary>
public sealed class ModuleAccessChecker(AppDbContext dbContext) : IModuleAccessChecker
{
    public Task<bool> HasModuleAsync(Guid userId, string moduleCode, CancellationToken ct = default) =>
        dbContext.UserSegments
            .Where(us => us.UserId == userId)
            .SelectMany(us => us.Segment!.SegmentModules)
            .AnyAsync(sm => sm.Module!.Code == moduleCode && sm.Module.IsActive, ct);
}
