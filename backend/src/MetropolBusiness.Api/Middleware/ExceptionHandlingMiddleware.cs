using System.Text.Json;
using MetropolBusiness.Application.Common;

namespace MetropolBusiness.Api.Middleware;

/// <summary>
/// Yakalanmamış istisnaları docs/API_CONTRACT.md §0.2 hata zarfına çevirir.
/// İstisna detayı yalnızca log'a yazılır; istemciye iç detay sızdırılmaz.
/// İstek gövdesi/query bilinçli olarak log'lanmaz — PII riski (CLAUDE.md kural 4).
/// </summary>
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}",
                context.Request.Method, context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";

            var error = new ErrorResponse(
                ErrorCodes.InternalError,
                "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.");

            await context.Response.WriteAsync(JsonSerializer.Serialize(error, JsonOptions));
        }
    }
}
