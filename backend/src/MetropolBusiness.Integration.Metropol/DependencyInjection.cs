using Microsoft.Extensions.DependencyInjection;

namespace MetropolBusiness.Integration.Metropol;

public static class DependencyInjection
{
    /// <summary>
    /// Metropol entegrasyon kayıtları. Faz 1.3'te MetropolTokenService,
    /// MetropolApiClient ve AES yardımcıları buraya eklenecek.
    /// </summary>
    public static IServiceCollection AddMetropolIntegration(this IServiceCollection services)
    {
        services.AddOptions<MetropolOptions>().BindConfiguration(MetropolOptions.SectionName);
        return services;
    }
}
