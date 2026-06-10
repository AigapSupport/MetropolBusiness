using System.Text;
using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Middleware;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Infrastructure;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Integration.Gemini;
using MetropolBusiness.Integration.Metropol;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

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
    });
builder.Services.AddAppAuthorization();

// Katman kayıtları — options pattern her projenin kendi DI uzantısında bağlanır.
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddMetropolIntegration();
builder.Services.AddGeminiIntegration();

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();

/// <summary>WebApplicationFactory tabanlı entegrasyon testlerinin erişebilmesi için.</summary>
public partial class Program { }
