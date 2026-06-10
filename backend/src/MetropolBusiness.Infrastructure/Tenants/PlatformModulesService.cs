using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Platform admin modül tanımları (TODO 1.9 backend, API_CONTRACT §13 Modül tanımları).
/// Modules PLATFORM SEVİYESİDİR (tenant'a ait değil, query filter yok — bilinçli);
/// IgnoreQueryFilters gerekmez. Pasifleştirilen modül segmentlere atanamaz ve
/// /me/modules listesinde görünmez. Kritik işlemler PII'siz yapısal log'lanır.
/// </summary>
public sealed class PlatformModulesService(
    AppDbContext dbContext,
    ILogger<PlatformModulesService> logger) : IPlatformModulesService
{
    private static readonly Error ModuleNotFoundError = new(
        ErrorCodes.NotFound, "Modül bulunamadı.", 404);

    private static readonly Error CodeTakenError = new(
        ErrorCodes.ValidationError,
        "Bu modül kodu zaten kullanılıyor.",
        400,
        new { field = "code" });

    public async Task<Result<ItemsResponse<PlatformModuleDto>>> GetModulesAsync(
        CancellationToken cancellationToken = default)
    {
        var items = await dbContext.Modules
            .AsNoTracking()
            .OrderBy(m => m.Code)
            .Select(m => new PlatformModuleDto(m.Id, m.Code, m.Name, m.IsActive))
            .ToListAsync(cancellationToken);

        return Result<ItemsResponse<PlatformModuleDto>>.Ok(
            new ItemsResponse<PlatformModuleDto>(items));
    }

    public async Task<Result<PlatformModuleDto>> CreateModuleAsync(
        ModuleUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateRequest(request, out var code, out var name);
        if (validationError is not null)
        {
            return Result<PlatformModuleDto>.Fail(validationError);
        }

        if (await dbContext.Modules.AnyAsync(m => m.Code == code, cancellationToken))
        {
            return Result<PlatformModuleDto>.Fail(CodeTakenError);
        }

        var module = new Module { Code = code, Name = name, IsActive = request.IsActive };
        dbContext.Modules.Add(module);
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Platform aksiyonu: {Action} ModuleCode={ModuleCode}", "module_created", module.Code);

        return Result<PlatformModuleDto>.Ok(ToModuleDto(module));
    }

    public async Task<Result<PlatformModuleDto>> UpdateModuleAsync(
        Guid id, ModuleUpsertRequest request, CancellationToken cancellationToken = default)
    {
        var validationError = ValidateRequest(request, out var code, out var name);
        if (validationError is not null)
        {
            return Result<PlatformModuleDto>.Fail(validationError);
        }

        var module = await dbContext.Modules
            .FirstOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (module is null)
        {
            return Result<PlatformModuleDto>.Fail(ModuleNotFoundError);
        }

        if (await dbContext.Modules.AnyAsync(m => m.Id != id && m.Code == code, cancellationToken))
        {
            return Result<PlatformModuleDto>.Fail(CodeTakenError);
        }

        module.Code = code;
        module.Name = name;
        module.IsActive = request.IsActive;
        await dbContext.SaveChangesAsync(cancellationToken);

        logger.LogInformation(
            "Platform aksiyonu: {Action} ModuleCode={ModuleCode} IsActive={IsActive}",
            "module_updated", module.Code, module.IsActive);

        return Result<PlatformModuleDto>.Ok(ToModuleDto(module));
    }

    private static Error? ValidateRequest(ModuleUpsertRequest request, out string code, out string name)
    {
        code = request.Code?.Trim() ?? string.Empty;
        name = request.Name?.Trim() ?? string.Empty;

        if (code.Length == 0)
        {
            return new Error(
                ErrorCodes.ValidationError, "Modül kodu zorunludur.", 400, new { field = "code" });
        }

        if (name.Length == 0)
        {
            return new Error(
                ErrorCodes.ValidationError, "Modül adı zorunludur.", 400, new { field = "name" });
        }

        return null;
    }

    private static PlatformModuleDto ToModuleDto(Module module) =>
        new(module.Id, module.Code, module.Name, module.IsActive);
}
