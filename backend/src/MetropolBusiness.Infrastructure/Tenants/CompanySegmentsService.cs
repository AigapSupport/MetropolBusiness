using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Firma admin segment yönetimi (TODO 1.9 backend, API_CONTRACT §12 Segmentler).
/// ICompanySegmentsService implementasyonu Infrastructure'dadır (AuthService deseni).
/// Segments query filter'ı tenant'a kapalıdır: başka tenant'ın segmenti görünmez.
/// Modül atamasında yalnızca platform tarafından tanımlı + AKTİF modül kodları kabul edilir.
/// </summary>
public sealed class CompanySegmentsService(AppDbContext dbContext) : ICompanySegmentsService
{
    private static readonly Error SegmentNotFoundError = new(
        ErrorCodes.NotFound, "Segment bulunamadı.", 404);

    private static readonly Error NameRequiredError = new(
        ErrorCodes.ValidationError,
        "Segment adı zorunludur.",
        400,
        new { field = "name" });

    private static readonly Error NameTakenError = new(
        ErrorCodes.ValidationError,
        "Bu ada sahip bir segment zaten var.",
        400,
        new { field = "name" });

    public async Task<Result<ItemsResponse<CompanySegmentDto>>> GetSegmentsAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await dbContext.Segments
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new CompanySegmentDto(
                s.Id,
                s.Name,
                s.UserSegments.Count,
                s.SegmentModules
                    .Select(sm => sm.Module!.Code)
                    .OrderBy(code => code)
                    .ToList()))
            .ToListAsync(cancellationToken);

        return Result<ItemsResponse<CompanySegmentDto>>.Ok(
            new ItemsResponse<CompanySegmentDto>(items));
    }

    public async Task<Result<CompanySegmentDto>> CreateSegmentAsync(
        SegmentUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return Result<CompanySegmentDto>.Fail(NameRequiredError);
        }

        // UNIQUE(tenant_id, name): filtreli sorgu kendi tenant'ına bakar, bu yeterlidir.
        if (await dbContext.Segments.AnyAsync(s => s.Name == name, cancellationToken))
        {
            return Result<CompanySegmentDto>.Fail(NameTakenError);
        }

        var segment = new Segment
        {
            // TenantId, SaveChanges'te firma admin bağlamından otomatik atanır (ITenantOwned).
            Name = name,
        };

        dbContext.Segments.Add(segment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<CompanySegmentDto>.Ok(new CompanySegmentDto(segment.Id, segment.Name, 0, []));
    }

    public async Task<Result<CompanySegmentDto>> UpdateSegmentAsync(
        Guid id, SegmentUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return Result<CompanySegmentDto>.Fail(NameRequiredError);
        }

        var segment = await dbContext.Segments
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (segment is null)
        {
            return Result<CompanySegmentDto>.Fail(SegmentNotFoundError);
        }

        if (await dbContext.Segments.AnyAsync(s => s.Id != id && s.Name == name, cancellationToken))
        {
            return Result<CompanySegmentDto>.Fail(NameTakenError);
        }

        segment.Name = name;
        await dbContext.SaveChangesAsync(cancellationToken);

        return await LoadSegmentDtoAsync(id, cancellationToken);
    }

    public async Task<Result<bool>> DeleteSegmentAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var segment = await dbContext.Segments
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (segment is null)
        {
            return Result<bool>.Fail(SegmentNotFoundError);
        }

        // Kullanıcısı olan segment silinmez: önce kullanıcılar başka segmente taşınmalı
        // (cascade ile sessiz bağ kaybı yerine açık uyarı — API_CONTRACT §12).
        var userCount = await dbContext.UserSegments
            .CountAsync(us => us.SegmentId == id, cancellationToken);
        if (userCount > 0)
        {
            return Result<bool>.Fail(new Error(
                ErrorCodes.ValidationError,
                $"Bu segmentte {userCount} kullanıcı var. Silmeden önce kullanıcıları başka segmente taşıyın.",
                400,
                new { field = "segmentId", userCount }));
        }

        dbContext.Segments.Remove(segment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<CompanySegmentDto>> UpdateSegmentModulesAsync(
        Guid id, SegmentModulesUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var segment = await dbContext.Segments
            .Include(s => s.SegmentModules)
            .FirstOrDefaultAsync(s => s.Id == id, cancellationToken);
        if (segment is null)
        {
            return Result<CompanySegmentDto>.Fail(SegmentNotFoundError);
        }

        var requestedCodes = (request.ModuleCodes ?? [])
            .Select(code => code?.Trim() ?? string.Empty)
            .Where(code => code.Length > 0)
            .Distinct()
            .ToList();

        // Modüller platform seviyesidir (filtre yok); yalnızca AKTİF tanımlar atanabilir.
        var modules = await dbContext.Modules
            .AsNoTracking()
            .Where(m => requestedCodes.Contains(m.Code) && m.IsActive)
            .ToListAsync(cancellationToken);

        var validCodes = modules.Select(m => m.Code).ToHashSet();
        var invalidCodes = requestedCodes.Where(code => !validCodes.Contains(code)).ToList();
        if (invalidCodes.Count > 0)
        {
            return Result<CompanySegmentDto>.Fail(new Error(
                ErrorCodes.ValidationError,
                "Tanımsız veya pasif modül kodları var.",
                400,
                new { invalidModuleCodes = invalidCodes }));
        }

        // Modül yetkileri komple değiştirilir (API_CONTRACT §12: { moduleCodes }).
        dbContext.SegmentModules.RemoveRange(segment.SegmentModules);
        segment.SegmentModules = modules
            .Select(m => new SegmentModule { SegmentId = segment.Id, ModuleId = m.Id })
            .ToList();

        await dbContext.SaveChangesAsync(cancellationToken);
        return await LoadSegmentDtoAsync(id, cancellationToken);
    }

    private async Task<Result<CompanySegmentDto>> LoadSegmentDtoAsync(
        Guid id, CancellationToken cancellationToken)
    {
        var dto = await dbContext.Segments
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new CompanySegmentDto(
                s.Id,
                s.Name,
                s.UserSegments.Count,
                s.SegmentModules
                    .Select(sm => sm.Module!.Code)
                    .OrderBy(code => code)
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

        return dto is null
            ? Result<CompanySegmentDto>.Fail(SegmentNotFoundError)
            : Result<CompanySegmentDto>.Ok(dto);
    }
}
