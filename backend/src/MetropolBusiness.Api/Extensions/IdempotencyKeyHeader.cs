using MetropolBusiness.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Extensions;

/// <summary>
/// Parasal uçların (sale/confirm, transfer) ZORUNLU Idempotency-Key başlığı
/// (API_CONTRACT §7-8, ARCHITECTURE §5.3). Başlık yoksa istek Metropol'e hiç
/// gitmeden VALIDATION_ERROR ile reddedilir — çift harcama koruması anahtarsız çalışamaz.
/// </summary>
public static class IdempotencyKeyHeader
{
    public const string HeaderName = "Idempotency-Key";

    /// <summary>Başlığı okur; boş/eksikse false döner (değer kırpılır).</summary>
    public static bool TryGet(HttpRequest request, out string key)
    {
        key = request.Headers[HeaderName].ToString().Trim();
        return key.Length > 0;
    }

    /// <summary>Eksik başlık yanıtı: 400 + ortak hata zarfı (API_CONTRACT §0.2).</summary>
    public static IActionResult MissingResult() =>
        new ObjectResult(new ErrorResponse(
            ErrorCodes.ValidationError,
            "Idempotency-Key başlığı zorunludur.",
            new { header = HeaderName }))
        {
            StatusCode = StatusCodes.Status400BadRequest,
        };
}
