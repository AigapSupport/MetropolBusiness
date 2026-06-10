using MetropolBusiness.Integration.Metropol.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Integration.Metropol;

public static class DependencyInjection
{
    /// <summary>
    /// Metropol entegrasyon kayıtları: iki ayrı HttpClient (auth + api base URL'leri,
    /// CLAUDE.md §6), token servisi ve tipli API client.
    /// </summary>
    public static IServiceCollection AddMetropolIntegration(this IServiceCollection services)
    {
        services.AddOptions<MetropolOptions>().BindConfiguration(MetropolOptions.SectionName);

        // Token TTL hesabı için; host ayrıca kaydetmediyse sistem saati kullanılır.
        services.TryAddSingleton(TimeProvider.System);

        // Auth tarafı (GenerateToken/getdate) — ayrı base URL (testauth.metropolodeme.com).
        services.AddHttpClient<IMetropolAuthClient, MetropolAuthClient>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<MetropolOptions>>().Value;
            client.BaseAddress = new Uri(options.AuthBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        services.AddScoped<MetropolTokenService>();

        // API tarafı (vpos/ivr uçları) — ayrı base URL (testapi.metropolcard.com).
        // Retry policy bilinçli olarak YOK: para uçlarında çift işlem riski (CLAUDE.md §6);
        // para dışı uçlarda retry, uygulama katmanında uca özgü eklenebilir.
        services.AddHttpClient<IMetropolApiClient, MetropolApiClient>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<MetropolOptions>>().Value;
            client.BaseAddress = new Uri(options.ApiBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}
