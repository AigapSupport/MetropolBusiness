using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Domain.Enums;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MetropolBusiness.Infrastructure.Tenants;

/// <summary>
/// Platform admin firma yönetimi (TODO 1.9 backend, API_CONTRACT §13 Firmalar).
/// Platform admin TENANT-ÜSTÜDÜR: token'ında tenant_id yoktur, bu yüzden tenant'lı
/// entity sorguları IgnoreQueryFilters gerektirir — her kullanımda ARCHITECTURE §3.3
/// gerekçesi yorumlanır. PII KURALI: platform admin kişisel veriye erişemez; yanıtlar
/// yalnızca userCount sayısı taşır, telefon/TCKN alanı DTO'larda yoktur.
/// Kritik işlemler AuditLog (Faz 3) gelene kadar ILogger ile PII'siz yapısal log'lanır.
/// </summary>
public sealed class PlatformTenantsService(
    AppDbContext dbContext,
    IPanelAuthService panelAuthService,
    IAuditLogger auditLogger,
    ILogger<PlatformTenantsService> logger) : IPlatformTenantsService
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    private static readonly Error TenantNotFoundError = new(
        ErrorCodes.NotFound, "Firma bulunamadı.", 404);

    private static readonly Error AdminNotFoundError = new(
        ErrorCodes.NotFound, "Firma yöneticisi bulunamadı.", 404);

    private static readonly Error CodeTakenError = new(
        ErrorCodes.ValidationError,
        "Bu firma kodu zaten kullanılıyor.",
        400,
        new { field = "code" });

    private static readonly Error TenantStatusInvalidError = new(
        ErrorCodes.ValidationError,
        "Geçersiz durum; 'pending', 'active' veya 'passive' olmalıdır.",
        400,
        new { field = "status" });

    private static readonly Error PhoneInvalidError = new(
        ErrorCodes.ValidationError,
        "Telefon numarası zorunludur; 10-11 haneli ve yalnızca rakamlardan oluşmalıdır.",
        400,
        new { field = "phone" });

    private static readonly Error AdminPhoneTakenError = new(
        ErrorCodes.ValidationError,
        "Bu telefon numarası firmada zaten kayıtlı.",
        400,
        new { field = "phone" });

    public async Task<Result<PagedResponse<PlatformTenantDto>>> GetTenantsAsync(
        string? q, string? status, int page, int pageSize,
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

        // IgnoreQueryFilters GEREKÇESİ (ARCHITECTURE §3.3): platform admin tenant-üstüdür;
        // userCount alt sorgusu Users filter'ına takılmasın diye filtre kapatılır.
        // PII DÖNMEZ: kullanıcılardan yalnızca SAYI alınır (soft-delete hariç), satır değil.
        var query = dbContext.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(t =>
                EF.Functions.Like(t.Name, $"%{term}%") || EF.Functions.Like(t.Code, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var parsedStatus = IdentityEnumMapping.ParseTenantStatus(status);
            if (parsedStatus is null)
            {
                return Result<PagedResponse<PlatformTenantDto>>.Fail(TenantStatusInvalidError);
            }

            query = query.Where(t => t.Status == parsedStatus);
        }

        var total = await query.CountAsync(cancellationToken);

        var rows = await query
            .OrderBy(t => t.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new
            {
                Tenant = t,
                UserCount = t.Users.Count(u => u.DeletedAt == null),
            })
            .ToListAsync(cancellationToken);

        var items = rows
            .Select(row => ToTenantDto(row.Tenant, row.UserCount))
            .ToList();

        return Result<PagedResponse<PlatformTenantDto>>.Ok(
            new PagedResponse<PlatformTenantDto>(items, page, pageSize, total));
    }

    public async Task<Result<PlatformTenantDto>> CreateTenantAsync(
        TenantCreateRequest request, CancellationToken cancellationToken = default)
    {
        var name = request.Name?.Trim();
        if (string.IsNullOrEmpty(name))
        {
            return Result<PlatformTenantDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Firma adı zorunludur.", 400, new { field = "name" }));
        }

        var code = request.Code?.Trim();
        if (string.IsNullOrEmpty(code))
        {
            return Result<PlatformTenantDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Firma kodu zorunludur.", 400, new { field = "code" }));
        }

        // Tenant entity'sinde query filter yok; code benzersizliği global kontrol edilir.
        if (await dbContext.Tenants.AnyAsync(t => t.Code == code, cancellationToken))
        {
            return Result<PlatformTenantDto>.Fail(CodeTakenError);
        }

        var tenant = new Tenant
        {
            Name = name,
            Code = code,
            Status = TenantStatus.Pending, // onay (durum değişimi) PUT ile yapılır
            MetropolConsumerRef = NormalizeOptional(request.MetropolConsumerId),
            BrandLogoUrl = NormalizeOptional(request.Branding?.LogoUrl),
            BrandPrimaryColor = NormalizeOptional(request.Branding?.PrimaryColor),
            BrandSecondaryColor = NormalizeOptional(request.Branding?.SecondaryColor),
        };

        dbContext.Tenants.Add(tenant);
        await dbContext.SaveChangesAsync(cancellationToken);

        // PII'siz denetim: yapısal log + audit_logs kaydı (PANELS_SPEC B.8).
        logger.LogInformation(
            "Platform aksiyonu: {Action} TenantId={TenantId}", "tenant_created", tenant.Id);
        await auditLogger.LogAsync("tenant_created", "tenant", tenant.Id.ToString(),
            new { code = tenant.Code }, tenant.Id, cancellationToken);

        return Result<PlatformTenantDto>.Ok(ToTenantDto(tenant, userCount: 0));
    }

    public async Task<Result<PlatformTenantDto>> UpdateTenantAsync(
        Guid id, TenantUpdateRequest request, CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tenant is null)
        {
            return Result<PlatformTenantDto>.Fail(TenantNotFoundError);
        }

        if (request.Status is not null)
        {
            var status = IdentityEnumMapping.ParseTenantStatus(request.Status);
            if (status is null)
            {
                return Result<PlatformTenantDto>.Fail(TenantStatusInvalidError);
            }

            if (tenant.Status != status.Value)
            {
                tenant.Status = status.Value;
                logger.LogInformation(
                    "Platform aksiyonu: {Action} TenantId={TenantId} YeniDurum={Status}",
                    "tenant_status_changed", tenant.Id, IdentityEnumMapping.TenantStatusToWire(status.Value));
                await auditLogger.LogAsync("tenant_status_changed", "tenant", tenant.Id.ToString(),
                    new { status = IdentityEnumMapping.TenantStatusToWire(status.Value) }, tenant.Id, cancellationToken);
            }
        }

        // null alan = değiştirme (kısmi güncelleme).
        if (request.Name is not null)
        {
            var name = request.Name.Trim();
            if (name.Length == 0)
            {
                return Result<PlatformTenantDto>.Fail(new Error(
                    ErrorCodes.ValidationError, "Firma adı boş olamaz.", 400, new { field = "name" }));
            }

            tenant.Name = name;
        }

        if (request.MetropolConsumerId is not null)
        {
            tenant.MetropolConsumerRef = NormalizeOptional(request.MetropolConsumerId);
        }

        if (request.Branding is not null)
        {
            tenant.BrandLogoUrl = NormalizeOptional(request.Branding.LogoUrl);
            tenant.BrandPrimaryColor = NormalizeOptional(request.Branding.PrimaryColor);
            tenant.BrandSecondaryColor = NormalizeOptional(request.Branding.SecondaryColor);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // IgnoreQueryFilters GEREKÇESİ (ARCHITECTURE §3.3): platform admin bağlamında
        // tenant_id claim'i yok; sayım için Users filter'ı kapatılır, yalnızca SAYI okunur.
        var userCount = await dbContext.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.TenantId == tenant.Id && u.DeletedAt == null, cancellationToken);

        return Result<PlatformTenantDto>.Ok(ToTenantDto(tenant, userCount));
    }

    public async Task<Result<TenantAdminCreatedDto>> InviteAdminAsync(
        Guid tenantId, TenantAdminInviteRequest request, CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return Result<TenantAdminCreatedDto>.Fail(TenantNotFoundError);
        }

        // Telefon ZORUNLU: panel/mobil girişi OTP ile telefon üzerindendir (API_CONTRACT §1).
        var phone = (request.Phone ?? string.Empty).Trim();
        if (phone.Length is < 10 or > 11 || !phone.All(char.IsAsciiDigit))
        {
            return Result<TenantAdminCreatedDto>.Fail(PhoneInvalidError);
        }

        var firstName = request.FirstName?.Trim();
        if (string.IsNullOrEmpty(firstName))
        {
            return Result<TenantAdminCreatedDto>.Fail(new Error(
                ErrorCodes.ValidationError, "Ad zorunludur.", 400, new { field = "firstName" }));
        }

        // IgnoreQueryFilters GEREKÇESİ (ARCHITECTURE §3.3): platform admin bağlamında
        // tenant_id claim'i yok; hedef tenant koşulu ELLE uygulanır. UNIQUE(tenant_id, phone)
        // soft-delete'li satırları da kapsadığı için DeletedAt koşulu bilerek konmaz.
        var phoneTaken = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(u => u.TenantId == tenantId && u.Phone == phone, cancellationToken);
        if (phoneTaken)
        {
            return Result<TenantAdminCreatedDto>.Fail(AdminPhoneTakenError);
        }

        var admin = new User
        {
            // Platform admin tenant-üstü olduğundan TenantId bağlamdan ATANAMAZ;
            // hedef tenant burada AÇIKÇA verilir (AppDbContext.SaveChanges kuralı).
            TenantId = tenantId,
            Phone = phone,
            FirstName = firstName,
            LastName = NormalizeOptional(request.LastName),
            Email = NormalizeOptional(request.Email),
            Role = UserRole.CompanyAdmin,
            Status = EntityStatus.Active,
        };

        // KARAR 2026-06-11: her kullanıcıya Metropol MemberId otomatik atanır (boşsa
        // Id'nin 32 hex hali; doluysa dokunulmaz) — bkz. User.EnsureMemberId + LESSONS.md.
        admin.EnsureMemberId();

        dbContext.Users.Add(admin);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Şifre belirleme daveti (POST /auth/set-password, 72 saat, tek kullanımlık).
        // E-posta gönderimi YOK — TODO: e-posta altyapısı gelince davet maili eklenecek;
        // şimdilik token'ı admin UI gösterir. TOKEN LOG'A YAZILMAZ (CLAUDE.md kural 4).
        var inviteToken = await panelAuthService.CreateInviteAsync(admin.Id, cancellationToken);

        // PII'siz log: telefon/e-posta/ad/token YAZILMAZ; yalnızca id + aksiyon (CLAUDE.md kural 4).
        logger.LogInformation(
            "Platform aksiyonu: {Action} TenantId={TenantId} UserId={UserId}",
            "tenant_admin_invited", tenantId, admin.Id);
        await auditLogger.LogAsync("tenant_admin_invited", "tenant_admin", admin.Id.ToString(),
            metadata: null, tenantId, cancellationToken);

        return Result<TenantAdminCreatedDto>.Ok(new TenantAdminCreatedDto(
            admin.Id,
            tenantId,
            admin.FirstName,
            admin.LastName,
            IdentityEnumMapping.RoleToWire(admin.Role),
            inviteToken));
    }

    public async Task<Result<AdminInviteResetDto>> ResetAdminInviteAsync(
        Guid tenantId, Guid userId, CancellationToken cancellationToken = default)
    {
        // IgnoreQueryFilters GEREKÇESİ (ARCHITECTURE §3.3): platform admin bağlamında
        // tenant_id claim'i yok; hedef tenant koşulu ELLE uygulanır. Kullanıcı o tenant'ın
        // company_admin'i değilse (başka tenant'ın admin'i / başka rol / silinmiş) ayrım
        // yapılmadan 404 döner — varlık bilgisi sızdırılmaz (CLAUDE.md kural 1).
        var isCompanyAdmin = await dbContext.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AnyAsync(
                u => u.Id == userId
                    && u.TenantId == tenantId
                    && u.Role == UserRole.CompanyAdmin
                    && u.DeletedAt == null,
                cancellationToken);
        if (!isCompanyAdmin)
        {
            return Result<AdminInviteResetDto>.Fail(AdminNotFoundError);
        }

        // YENİ davet token'ı (set-password, 72 saat, tek kullanımlık). MEVCUT ŞİFRE KORUNUR:
        // davet yalnızca yeni şifre belirleme yolunu açar; kullanıcı set-password yapana kadar
        // eski şifresiyle giriş yapmaya devam eder. E-posta altyapısı yok — token'ı admin UI
        // gösterir; TOKEN LOG'A YAZILMAZ (CLAUDE.md kural 4). Self-servis "şifremi unuttum"
        // SMTP gelince (docs/TODO.md).
        var inviteToken = await panelAuthService.CreateInviteAsync(userId, cancellationToken);

        // PII'siz denetim izi: telefon/e-posta/ad/token YOK, yalnız id + aksiyon
        // (AuditLog entity'si Faz 3'te).
        logger.LogInformation(
            "Platform aksiyonu: {Action} TenantId={TenantId} UserId={UserId}",
            "admin_invite_reset", tenantId, userId);
        await auditLogger.LogAsync("admin_invite_reset", "tenant_admin", userId.ToString(),
            metadata: null, tenantId, cancellationToken);

        return Result<AdminInviteResetDto>.Ok(new AdminInviteResetDto(inviteToken));
    }

    private static PlatformTenantDto ToTenantDto(Tenant tenant, int userCount) => new(
        tenant.Id,
        tenant.Name,
        tenant.Code,
        IdentityEnumMapping.TenantStatusToWire(tenant.Status),
        // Yalnızca VARLIK bilgisi (bool): sır referansının kendisi yanıta ASLA konmaz
        // (CLAUDE.md kural 2).
        !string.IsNullOrWhiteSpace(tenant.MetropolConsumerRef),
        new TenantBrandingDto(
            tenant.BrandLogoUrl,
            tenant.BrandPrimaryColor,
            tenant.BrandSecondaryColor),
        userCount,
        tenant.CreatedAt);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
