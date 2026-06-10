using MetropolBusiness.Application.Auth;
using MetropolBusiness.Application.Cards;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Application.Content;
using MetropolBusiness.Application.Payments;
using MetropolBusiness.Application.Tenants;
using MetropolBusiness.Application.Users;
using MetropolBusiness.Infrastructure.Auth;
using MetropolBusiness.Infrastructure.Cache;
using MetropolBusiness.Infrastructure.Cards;
using MetropolBusiness.Infrastructure.Content;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Payments;
using MetropolBusiness.Infrastructure.Persistence;
using MetropolBusiness.Infrastructure.Security;
using MetropolBusiness.Infrastructure.Sms;
using MetropolBusiness.Infrastructure.Tenants;
using MetropolBusiness.Infrastructure.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetropolBusiness.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Altyapı kayıtları: EF Core (Postgres, snake_case), JWT üretimi, auth (OTP/refresh)
    /// store'ları (IDistributedCache: Redis.Enabled=true → Redis, değilse in-memory), options.
    /// SignalR Faz 2.3'te eklenecek.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RedisOptions>().BindConfiguration(RedisOptions.SectionName);
        services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.SectionName);
        services.AddOptions<AuthOptions>().BindConfiguration(AuthOptions.SectionName);

        // Dağıtık cache: Redis kapalıyken in-memory IDistributedCache (tek instance geliştirme/test).
        var redis = configuration.GetSection(RedisOptions.SectionName).Get<RedisOptions>() ?? new RedisOptions();
        if (redis.Enabled)
        {
            services.AddStackExchangeRedisCache(options => options.Configuration = redis.Configuration);
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        // Bağlantı dizesi yoksa (örn. DB'siz smoke ortamı) kayıt atlanır; /health yine çalışır.
        var connectionString = configuration.GetConnectionString("Postgres");
        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<AppDbContext>(options => options
                .UseNpgsql(connectionString)
                .UseSnakeCaseNamingConvention());

            // AuthService AppDbContext ister; DB'siz ortamda auth uçları da devre dışı kalır.
            services.AddScoped<IAuthService, AuthService>();

            // Panel girişi (e-posta+şifre, TODO 1.9 — PANELS_SPEC §0.4 kararı).
            services.AddScoped<IPanelAuthService, PanelAuthService>();

            // İçerik servisleri de AppDbContext ister (TODO 1.8).
            services.AddScoped<IContentService, ContentService>();
            services.AddScoped<IContentAdminService, ContentAdminService>();

            // /me + firma admin + platform admin + marka servisleri (TODO 1.9/1.10 backend).
            services.AddScoped<IMeService, MeService>();
            services.AddScoped<ICompanyUsersService, CompanyUsersService>();
            services.AddScoped<ICompanySegmentsService, CompanySegmentsService>();
            services.AddScoped<IPlatformTenantsService, PlatformTenantsService>();
            services.AddScoped<IPlatformModulesService, PlatformModulesService>();
            services.AddScoped<ITenantBrandingService, TenantBrandingService>();

            // Kart + bakiye/işlem servisleri (TODO 1.4/1.5 backend) — AppDbContext ve
            // IMetropolApiClient (AddMetropolIntegration kaydı) gerektirir.
            services.AddScoped<ICardsService, CardsService>();
            services.AddScoped<IBalanceService, BalanceService>();

            // Harcama + transfer servisleri (TODO 1.6/1.7 backend) — parasal uçlar,
            // payment_idempotency ile çift işlem engeli (ARCHITECTURE §5.3).
            services.AddScoped<IPaymentsService, PaymentsService>();
            services.AddScoped<ITransfersService, TransfersService>();
        }

        // At-rest alan şifrelemesi — şimdilik placeholder; gerçek (DataProtection/KMS)
        // implementasyon Faz sonrası yalnızca bu kaydı değiştirerek devreye girer.
        services.AddSingleton<IFieldCipher, PlaceholderFieldCipher>();

        // Panel şifre hash'leme — durumsuz, singleton yeterli.
        services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IOtpStore, DistributedCacheOtpStore>();
        services.AddSingleton<IRefreshTokenStore, DistributedCacheRefreshTokenStore>();
        services.AddSingleton<IRateLimiter, DistributedCacheRateLimiter>();
        services.AddSingleton<ISmsSender, NoopSmsSender>();

        return services;
    }
}
