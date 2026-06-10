using MetropolBusiness.Application.Auth;
using MetropolBusiness.Infrastructure.Cache;
using MetropolBusiness.Infrastructure.Identity;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetropolBusiness.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Altyapı kayıtları: EF Core (Postgres, snake_case), JWT üretimi, options.
    /// Redis bağlantısı ve SignalR Faz 1.2/2.3'te eklenecek.
    /// </summary>
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RedisOptions>().BindConfiguration(RedisOptions.SectionName);
        services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.SectionName);

        // Bağlantı dizesi yoksa (örn. DB'siz smoke ortamı) kayıt atlanır; /health yine çalışır.
        var connectionString = configuration.GetConnectionString("Postgres");
        if (!string.IsNullOrEmpty(connectionString))
        {
            services.AddDbContext<AppDbContext>(options => options
                .UseNpgsql(connectionString)
                .UseSnakeCaseNamingConvention());
        }

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        return services;
    }
}
