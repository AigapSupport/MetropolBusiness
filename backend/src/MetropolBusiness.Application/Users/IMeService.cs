using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Users;

/// <summary>
/// /me use-case'leri (TODO 1.9 backend, API_CONTRACT §2) — oturum açmış kullanıcının
/// kendi profili. İmplementasyon Infrastructure'dadır (AppDbContext gerektirir;
/// AuthService deseni). Tenant izolasyonu query filter'larla; TCKN yalnızca maskeli döner.
/// </summary>
public interface IMeService
{
    /// <summary>GET /me — profil + tenant.branding; tcknMasked Masking.MaskTckn ile.</summary>
    Task<Result<MeResponse>> GetMeAsync(CancellationToken cancellationToken = default);

    /// <summary>PUT /me — firstName/lastName/email/city/avatarUrl; 200 güncel me.</summary>
    Task<Result<MeResponse>> UpdateMeAsync(
        MeUpdateRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// PUT /me/tckn — 11 hane doğrulanır, IFieldCipher ile şifrelenip saklanır;
    /// yanıtta yalnızca maskeli değer döner (CLAUDE.md kural 4).
    /// </summary>
    Task<Result<MeResponse>> UpdateTcknAsync(
        TcknUpdateRequest request, CancellationToken cancellationToken = default);

    /// <summary>GET /me/preferences — kayıtlı tercih yoksa varsayılanlar (hepsi açık).</summary>
    Task<Result<PreferencesDto>> GetPreferencesAsync(CancellationToken cancellationToken = default);

    /// <summary>PUT /me/preferences — 200 güncel tercihler.</summary>
    Task<Result<PreferencesDto>> UpdatePreferencesAsync(
        PreferencesDto request, CancellationToken cancellationToken = default);

    /// <summary>
    /// GET /me/modules — kullanıcının segmentlerinden segment_modules BİRLEŞİMİ
    /// (distinct); yalnızca aktif modüller listelenir.
    /// </summary>
    Task<Result<MeModulesResponse>> GetModulesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// DELETE /me — hesabımı sil (PRD §11.2): SOFT delete (DeletedAt + Status=Passive,
    /// CLAUDE.md kural 7); kart bağları/talepler denetlenebilirlik için kalır. Silinen
    /// kullanıcı OTP/refresh akışlarında bulunamaz olur (aktif+silinmemiş filtreleri).
    /// </summary>
    Task<Result<bool>> DeleteMeAsync(CancellationToken cancellationToken = default);
}
