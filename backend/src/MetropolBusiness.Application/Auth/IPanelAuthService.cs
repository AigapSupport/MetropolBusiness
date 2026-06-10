using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Application.Auth;

/// <summary>
/// Panel girişi use-case'leri (TODO 1.9, PANELS_SPEC §0.4 kararı: kendi auth —
/// e-posta+şifre, OTP yok). Yalnızca panel rolleri (company_admin/approver/platform_admin)
/// giriş yapabilir; enduser panele giremez. Beklenen hatalar Result ile döner;
/// implementasyon Infrastructure'dadır (AppDbContext gerektirir — katman yönü:
/// Api → Application → Domain, AuthService ile aynı desen).
/// </summary>
public interface IPanelAuthService
{
    /// <summary>
    /// POST /auth/login — e-posta+şifre doğrular, token çifti üretir.
    /// 5 başarısız denemede 15 dk kilit (LOGIN_LOCKED 423); e-posta başına 10/dk rate-limit.
    /// </summary>
    Task<Result<PanelLoginResponse>> LoginAsync(
        PanelLoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /auth/set-password — davet token'ı ile şifre belirler (politika ihlali
    /// VALIDATION_ERROR, geçersiz/kullanılmış token NOT_FOUND). Davet tek kullanımlıktır.
    /// </summary>
    Task<Result<bool>> SetPasswordAsync(
        SetPasswordRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Davet token'ı üretir ve cache'e yazar (TTL 72 saat). Ham token YALNIZCA çağırana
    /// döner (admin UI gösterir); cache'te hash'i saklanır ve hiçbir log'a yazılmaz
    /// (CLAUDE.md kural 4). E-posta gönderimi yoktur (TODO: e-posta altyapısı Faz sonrası).
    /// </summary>
    Task<string> CreateInviteAsync(Guid userId, CancellationToken cancellationToken = default);
}
