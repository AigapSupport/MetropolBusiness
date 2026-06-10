using MetropolBusiness.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Extensions;

/// <summary>
/// Application Result'ını HTTP yanıtına çevirir: başarı → 200 + değer,
/// beklenen hata → Error.HttpStatus + hata zarfı { code, message, details } (API_CONTRACT §0.2).
/// </summary>
public static class ResultToActionResultExtensions
{
    public static IActionResult ToActionResult<T>(this Result<T> result)
    {
        if (result.IsSuccess)
        {
            return new OkObjectResult(result.Value);
        }

        return ToErrorResult(result.Error!);
    }

    /// <summary>Başarıda istenen status kodu (örn. 201 Created) ile döner.</summary>
    public static IActionResult ToActionResult<T>(this Result<T> result, int successStatusCode)
    {
        if (result.IsSuccess)
        {
            return new ObjectResult(result.Value) { StatusCode = successStatusCode };
        }

        return ToErrorResult(result.Error!);
    }

    /// <summary>Başarıda gövdesiz 204 (silme uçları), hatada ortak zarf.</summary>
    public static IActionResult ToNoContentResult<T>(this Result<T> result) =>
        result.IsSuccess ? new NoContentResult() : ToErrorResult(result.Error!);

    private static IActionResult ToErrorResult(Error error) =>
        new ObjectResult(new ErrorResponse(error.Code, error.Message, error.Details))
        {
            StatusCode = error.HttpStatus,
        };
}
