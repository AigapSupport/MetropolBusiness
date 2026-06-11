using System.Text;
using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Middleware;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Infrastructure;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Integration.Gemini;
using MetropolBusiness.Integration.Metropol;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Yapısal (JSON) log. PII log yasağı: istek gövdesi ve hassas alanlar log'lanmaz (CLAUDE.md kural 4).
builder.Logging.ClearProviders();
builder.Logging.AddJsonConsole(options =>
{
    options.UseUtcTimestamp = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        // Otomatik model doğrulama 400'ü de ortak hata zarfını kullanır (API_CONTRACT §0.2).
        options.InvalidModelStateResponseFactory = context =>
        {
            var fields = context.ModelState
                .Where(kvp => kvp.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray());

            return new BadRequestObjectResult(new ErrorResponse(
                ErrorCodes.ValidationError,
                "Geçersiz istek. Lütfen alanları kontrol edin.",
                fields));
        };
    });
builder.Services.AddHealthChecks();

// Tenant bağlamı: her istekte JWT claim'lerinden okunur (ARCHITECTURE §3.2).
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantContext, HttpTenantContext>();

// JWT bearer doğrulama. SigningKey env/secret'tan gelir; boşken /health gibi anonim uçlar çalışır,
// korumalı uçlar token doğrulayamaz (üretimde key zorunlu).
var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Claim adları ham kalsın: sub / tenant_id / role (HttpTenantContext bunları okur).
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = string.IsNullOrEmpty(jwt.SigningKey)
                ? null
                : new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
        };

        // SignalR: WebSocket'te Authorization header taşınamaz; token yalnızca
        // /hubs yollarında access_token query parametresinden okunur (API_CONTRACT §10).
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken)
                    && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
        };
    });
builder.Services.AddAppAuthorization();

// Sohbet realtime (Faz 2.3) — Redis backplane çoklu instance'ta eklenecek (ARCHITECTURE §7).
builder.Services.AddSignalR();

// Katman kayıtları — options pattern her projenin kendi DI uzantısında bağlanır.
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddMetropolIntegration();
builder.Services.AddGeminiIntegration();

var app = builder.Build();

// Deploy migration adımı (aigap-deploy-template MIGRATE_CMD):
//   dotnet MetropolBusiness.Api.dll migrate  → migration'ları uygular ve ÇIKAR.
// Ayrıca Database:MigrateOnStartup=true ile normal açılışta da uygulanabilir
// (tek-instance VPS için; çok-instance dağıtımda yalnız migrate komutu kullanılır).
var migrateOnly = args.Contains("migrate");
if (migrateOnly || builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var migrationScope = app.Services.CreateScope();
    var dbContext = migrationScope.ServiceProvider
        .GetRequiredService<MetropolBusiness.Infrastructure.Persistence.AppDbContext>();
    dbContext.Database.Migrate();
    app.Logger.LogInformation("Veritabanı migration'ları uygulandı.");
    if (migrateOnly)
    {
        return;
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<MetropolBusiness.Api.Hubs.ChatHub>("/hubs/chat");

app.Run();

/// <summary>WebApplicationFactory tabanlı entegrasyon testlerinin erişebilmesi için.</summary>
public partial class Program { }
