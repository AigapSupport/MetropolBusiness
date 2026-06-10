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

        var error = result.Error!;
        return new ObjectResult(new ErrorResponse(error.Code, error.Message, error.Details))
        {
            StatusCode = error.HttpStatus,
        };
    }
}
