using MetropolBusiness.Infrastructure.Cache;
using MetropolBusiness.Infrastructure.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MetropolBusiness.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Altyapı kayıtları. Faz 1'de EF Core (Postgres), Redis bağlantısı,
    /// SignalR ve Identity implementasyonları buraya eklenecek.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddOptions<RedisOptions>().BindConfiguration(RedisOptions.SectionName);
        services.AddOptions<JwtOptions>().BindConfiguration(JwtOptions.SectionName);
        return services;
    }
}
