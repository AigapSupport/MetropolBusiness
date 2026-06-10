namespace MetropolBusiness.Application.Common;

/// <summary>
/// Tüm hata yanıtlarının ortak zarfı (docs/API_CONTRACT.md §0.2):
/// { "code": "...", "message": "...", "details": { } }
/// </summary>
public sealed record ErrorResponse(string Code, string Message, object? Details = null);
