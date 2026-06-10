using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Integration.Metropol;

public static class DependencyInjection
{
    /// <summary>
    /// Metropol entegrasyon kayıtları. IMetropolAuthClient'ın HTTP implementasyonu ve
    /// MetropolApiClient, gerçek sözleşme dosyası (MetropolModels.cs / ApiEndpoints)
    /// sağlanınca eklenecek (bkz. LESSONS.md); o yüzden burada yalnızca MetropolTokenService kayıtlıdır.
    /// </summary>
    public static IServiceCollection AddMetropolIntegration(this IServiceCollection services)
    {
        services.AddOptions<MetropolOptions>().BindConfiguration(MetropolOptions.SectionName);

        // Token TTL hesabı için; host ayrıca kaydetmediyse sistem saati kullanılır.
        services.TryAddSingleton(TimeProvider.System);

        // Factory ile kayıt bilinçlidir: IMetropolAuthClient implementasyonu henüz yokken
        // constructor tabanlı kayıt, Development'taki ValidateOnBuild'i kırardı.
        // Servis ancak client kaydı eklendikten sonra çözülebilir; kapsam: scoped.
        services.AddScoped(provider => new MetropolTokenService(
            provider.GetRequiredService<IMetropolAuthClient>(),
            provider.GetRequiredService<IDistributedCache>(),
            provider.GetRequiredService<IOptions<MetropolOptions>>(),
            provider.GetRequiredService<TimeProvider>()));

        return services;
    }
}
