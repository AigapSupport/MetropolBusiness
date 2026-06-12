using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Integration.Metropol.Services;

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
        catch (MetropolEndpointUnavailableException ex)
        {
            // Uç Metropol ortamında yok (404) — beklenmeyen hata DEĞİL, bilinen kısıt
            // (LESSONS 2026-06-12). 503 + açık mesajla dönülür; uç yolu PII içermez.
            logger.LogWarning("Metropol ucu yok: {Endpoint} ({Method} {Path})",
                ex.Endpoint, context.Request.Method, context.Request.Path);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.ContentType = "application/json; charset=utf-8";
            await context.Response.WriteAsync(JsonSerializer.Serialize(
                new ErrorResponse(
                    ErrorCodes.ProviderUnavailable,
                    "Bu işlem Metropol test ortamında henüz açık değil (uç adresi bekleniyor)."),
                JsonOptions));
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
