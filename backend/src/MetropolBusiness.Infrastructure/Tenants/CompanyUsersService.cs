using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Firma admin kullanıcı yönetimi (TODO 1.9 backend, API_CONTRACT §12 Kullanıcılar).
/// ICompanyUsersService implementasyonu Infrastructure'dadır (AuthService deseni).
/// Tenant izolasyonu Users query filter'ıyla (TenantId + soft-delete) sağlanır:
/// firma admin başka tenant'ın kullanıcısını LİSTELEYEMEZ ve değiştiremez.
/// Silme yok — DELETE pasifleştirir (Status=Passive, CLAUDE.md kural 7).
/// </summary>
public sealed class CompanyUsersService(AppDbContext dbContext, ITenantContext tenantContext)
    : ICompanyUsersService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private static readonly Error UserNotFoundError = new(
        ErrorCodes.NotFound, "Kullanıcı bulunamadı.", 404);

    private static readonly Error PhoneTakenError = new(
        ErrorCodes.ValidationError,
        "Bu telefon numarası firmada zaten kayıtlı.",
        400,
        new { field = "phone" });

    private static readonly Error PhoneInvalidError = new(
        ErrorCodes.ValidationError,
        "Telefon numarası 10-11 haneli ve yalnızca rakamlardan oluşmalıdır.",
        400,
        new { field = "phone" });

    private static readonly Error RoleInvalidError = new(
        ErrorCodes.ValidationError,
        "Geçersiz rol; 'enduser', 'company_admin' veya 'approver' olmalıdır.",
        400,
        new { field = "role" });

    private static readonly Error StatusInvalidError = new(
        ErrorCodes.ValidationError,
        "Geçersiz durum; 'active' veya 'passive' olmalıdır.",
        400,
        new { field = "status" });

    private static readonly Error SegmentsInvalidError = new(
        ErrorCodes.ValidationError,
        "Segmentlerden bazıları bulunamadı.",
        400,
        new { field = "segmentIds" });

    public async Task<Result<PagedResponse<CompanyUserDto>>> GetUsersAsync(
        string? q, Guid? segmentId, string? status, int page, int pageSize,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            page = 1;
        }

        if (pageSize < 1 || pageSize > MaxPageSize)
        {
            pageSize = DefaultPageSize;
        }

        // Users query filter'ı tenant + soft-delete'i zaten uygular (CLAUDE.md kural 1);
        // ek koşullar yalnızca arama/filtre içindir.
        var query = dbContext.Users
            .AsNoTracking()
            .Include(u => u.UserSegments)
            .ThenInclude(us => us.Segment)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(u =>
                (u.FirstName != null && EF.Functions.Like(u.FirstName, $"%{term}%"))
                || (u.LastName != null && EF.Functions.Like(u.LastName, $"%{term}%"))
                || (u.Email != null && EF.Functions.Like(u.Email, $"%{term}%"))
                || EF.Functions.Like(u.Phone, $"%{term}%"));
        }

        if (segmentId is not null)
        {
            query = query.Where(u => u.UserSegments.Any(us => us.SegmentId == segmentId));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var parsedStatus = IdentityEnumMapping.ParseEntityStatus(status);
            if (parsedStatus is null)
            {
                return Result<PagedResponse<CompanyUserDto>>.Fail(StatusInvalidError);
            }

            query = query.Where(u => u.Status == parsedStatus);
        }

        var total = await query.CountAsync(cancellationToken);

        // Sıralama ad/soyad/telefon üzerinden (string — SQLite testlerinde de çalışır).
        var users = await query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ThenBy(u => u.Phone)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return Result<PagedResponse<CompanyUserDto>>.Ok(new PagedResponse<CompanyUserDto>(
            users.Select(ToUserDto).ToList(), page, pageSize, total));
    }

    public async Task<Result<CompanyUserDto>> CreateUserAsync(
        CompanyUserCreateRequest request, CancellationToken cancellationToken = default)
    {
        var phone = (request.Phone ?? string.Empty).Trim();
        if (!IsValidPhone(phone))
        {
            return Result<CompanyUserDto>.Fail(PhoneInvalidError);
        }

        var role = request.Role is null
            ? UserRole.EndUser
            : IdentityEnumMapping.ParseTenantRole(request.Role);
        if (role is null)
        {
            return Result<CompanyUserDto>.Fail(RoleInvalidError);
        }

        if (await IsPhoneTakenInTenantAsync(phone, cancellationToken))
        {
            return Result<CompanyUserDto>.Fail(PhoneTakenError);
        }

        var segmentIds = (request.SegmentIds ?? []).Distinct().ToList();
        if (!await SegmentsBelongToTenantAsync(segmentIds, cancellationToken))
        {
            return Result<CompanyUserDto>.Fail(SegmentsInvalidError);
        }

        var user = new User
        {
            // TenantId, SaveChanges'te firma admin bağlamından otomatik atanır (ITenantOwned).
            Phone = phone,
            FirstName = NormalizeOptional(request.FirstName),
            LastName = NormalizeOptional(request.LastName),
            Email = NormalizeOptional(request.Email),
            Role = role.Value,
            Status = EntityStatus.Active,
            UserSegments = segmentIds
                .Select(segmentId => new UserSegment { SegmentId = segmentId })
                .ToList(),
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return await LoadUserDtoAsync(user.Id, cancellationToken);
    }

    public async Task<Result<CompanyUserDto>> UpdateUserAsync(
        Guid id, CompanyUserUpdateRequest request, CancellationToken cancellationToken = default)
    {
        // Query filter sayesinde başka tenant'ın kullanıcısı bulunamaz → NOT_FOUND (sızıntı yok).
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<CompanyUserDto>.Fail(UserNotFoundError);
        }

        if (request.Role is not null)
        {
            var role = IdentityEnumMapping.ParseTenantRole(request.Role);
            if (role is null)
            {
                return Result<CompanyUserDto>.Fail(RoleInvalidError);
            }

            user.Role = role.Value;
        }

        if (request.Status is not null)
        {
            var status = IdentityEnumMapping.ParseEntityStatus(request.Status);
            if (status is null)
            {
                return Result<CompanyUserDto>.Fail(StatusInvalidError);
            }

            user.Status = status.Value;
        }

        // null alan = değiştirme (kısmi güncelleme); boş string = temizle.
        if (request.FirstName is not null)
        {
            user.FirstName = NormalizeOptional(request.FirstName);
        }

        if (request.LastName is not null)
        {
            user.LastName = NormalizeOptional(request.LastName);
        }

        if (request.Email is not null)
        {
            user.Email = NormalizeOptional(request.Email);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return await LoadUserDtoAsync(user.Id, cancellationToken);
    }

    public async Task<Result<bool>> DeactivateUserAsync(
        Guid id, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<bool>.Fail(UserNotFoundError);
        }

        // Hard delete YOK: kayıt pasifleşir, login/refresh akışları Active koşuluyla reddeder.
        user.Status = EntityStatus.Passive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return Result<bool>.Ok(true);
    }

    public async Task<Result<CompanyUserDto>> UpdateUserSegmentsAsync(
        Guid id, UserSegmentsUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users
            .Include(u => u.UserSegments)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return Result<CompanyUserDto>.Fail(UserNotFoundError);
        }

        var segmentIds = (request.SegmentIds ?? []).Distinct().ToList();
        if (!await SegmentsBelongToTenantAsync(segmentIds, cancellationToken))
        {
            return Result<CompanyUserDto>.Fail(SegmentsInvalidError);
        }

        // Segment bağları komple değiştirilir (API_CONTRACT §12: { segmentIds }).
        dbContext.UserSegments.RemoveRange(user.UserSegments);
        user.UserSegments = segmentIds
            .Select(segmentId => new UserSegment { UserId = user.Id, SegmentId = segmentId })
            .ToList();

        await dbContext.SaveChangesAsync(cancellationToken);
        return await LoadUserDtoAsync(user.Id, cancellationToken);
    }

    /// <summary>
    /// Telefon tenant içinde benzersiz mi? IgnoreQueryFilters AÇIK GEREKÇE (ARCHITECTURE §3.3):
    /// UNIQUE(tenant_id, phone) indeksi soft-delete'li satırları da kapsar; filtreli sorgu
    /// silinmiş kaydı görmez ve insert DB hatasıyla patlar. Tenant koşulu ELLE uygulanır.
    /// </summary>
    private async Task<bool> IsPhoneTakenInTenantAsync(string phone, CancellationToken cancellationToken)
    {
        var tenantId = tenantContext.RequiredTenantId;
        return await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(u => u.TenantId == tenantId && u.Phone == phone, cancellationToken);
    }

    /// <summary>Segments query filter'ı tenant'a kapalı: başka tenant'ın segment id'si bulunamaz.</summary>
    private async Task<bool> SegmentsBelongToTenantAsync(
        List<Guid> segmentIds, CancellationToken cancellationToken)
    {
        if (segmentIds.Count == 0)
        {
            return true;
        }

        var validCount = await dbContext.Segments
            .AsNoTracking()
            .CountAsync(s => segmentIds.Contains(s.Id), cancellationToken);
        return validCount == segmentIds.Count;
    }

    /// <summary>Yanıt DTO'su segment adlarıyla döner; kayıt taze sorguyla yüklenir.</summary>
    private async Task<Result<CompanyUserDto>> LoadUserDtoAsync(
        Guid id, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .Include(u => u.UserSegments)
            .ThenInclude(us => us.Segment)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        return user is null
            ? Result<CompanyUserDto>.Fail(UserNotFoundError)
            : Result<CompanyUserDto>.Ok(ToUserDto(user));
    }

    private static CompanyUserDto ToUserDto(User user) => new(
        user.Id,
        user.FirstName,
        user.LastName,
        user.Phone,
        user.Email,
        IdentityEnumMapping.RoleToWire(user.Role),
        IdentityEnumMapping.StatusToWire(user.Status),
        user.UserSegments
            .Where(us => us.Segment is not null)
            .OrderBy(us => us.Segment!.Name)
            .Select(us => new CompanyUserSegmentDto(us.SegmentId, us.Segment!.Name))
            .ToList());

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool IsValidPhone(string phone) =>
        phone.Length is >= 10 and <= 11 && phone.All(char.IsAsciiDigit);
}
