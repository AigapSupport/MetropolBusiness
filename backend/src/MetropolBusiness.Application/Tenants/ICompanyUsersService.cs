using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Tenants;

/// <summary>
/// Firma admin kullanıcı yönetimi (TODO 1.9 backend, API_CONTRACT §12 Kullanıcılar).
/// İmplementasyon Infrastructure'dadır (AppDbContext gerektirir; AuthService deseni).
/// Tenant izolasyonu Users query filter'ıyla; firma admin yalnızca kendi tenant'ını görür.
/// </summary>
public interface ICompanyUsersService
{
    /// <summary>GET /admin/company/users — ?q&amp;segmentId&amp;status&amp;page sayfalı liste.</summary>
    Task<Result<PagedResponse<CompanyUserDto>>> GetUsersAsync(
        string? q, Guid? segmentId, string? status, int page, int pageSize,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /admin/company/users — davet/ekle (201). Telefon tenant içinde benzersizdir;
    /// ihlalde VALIDATION_ERROR (soft-delete'li kayıt da UNIQUE indekste sayılır).
    /// </summary>
    Task<Result<CompanyUserDto>> CreateUserAsync(
        CompanyUserCreateRequest request, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/users/{id} — profil/rol/durum güncelleme.</summary>
    Task<Result<CompanyUserDto>> UpdateUserAsync(
        Guid id, CompanyUserUpdateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// DELETE /admin/company/users/{id} — PASİFLEŞTİRİR (Status=Passive);
    /// hard delete YOK (CLAUDE.md kural 7: soft yaklaşım).
    /// </summary>
    Task<Result<bool>> DeactivateUserAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>PUT /admin/company/users/{id}/segments — segment bağları komple değişir.</summary>
    Task<Result<CompanyUserDto>> UpdateUserSegmentsAsync(
        Guid id, UserSegmentsUpdateRequest request, CancellationToken cancellationToken = default);
}
