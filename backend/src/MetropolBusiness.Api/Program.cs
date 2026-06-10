using MetropolBusiness.Api.Middleware;
using MetropolBusiness.Infrastructure;
using MetropolBusiness.Integration.Gemini;
using MetropolBusiness.Integration.Metropol;

var builder = WebApplication.CreateBuilder(args);

// Yapısal (JSON) log. PII log yasağı: istek gövdesi ve hassas alanlar log'lanmaz (CLAUDE.md kural 4).
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.UseUtcTimestamp = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});

builder.Services.AddControllers();
builder.Services.AddHealthChecks();

// Katman kayıtları — options pattern her projenin kendi DI uzantısında bağlanır.
builder.Services.AddInfrastructure();
builder.Services.AddMetropolIntegration();
builder.Services.AddGeminiIntegration();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();

/// <summary>WebApplicationFactory tabanlı entegrasyon testlerinin erişebilmesi için.</summary>
public partial class Program { }
