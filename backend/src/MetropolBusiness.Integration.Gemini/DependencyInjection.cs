using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace MetropolBusiness.Integration.Gemini;

public static class DependencyInjection
{
    /// <summary>Gemini entegrasyonu: options + HTTP client (ApiKey boşken kayıt yapılır, kullanım anında hata).</summary>
    public static IServiceCollection AddGeminiIntegration(this IServiceCollection services)
    {
        services.AddOptions<GeminiOptions>().BindConfiguration(GeminiOptions.SectionName);

        services.AddHttpClient<IGeminiClient, GeminiClient>((provider, client) =>
        {
            var options = provider.GetRequiredService<IOptions<GeminiOptions>>().Value;
            client.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        return services;
    }
}
