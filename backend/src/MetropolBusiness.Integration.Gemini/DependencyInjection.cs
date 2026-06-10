using Microsoft.Extensions.DependencyInjection;

namespace MetropolBusiness.Integration.Gemini;

public static class DependencyInjection
{
    /// <summary>Gemini entegrasyon kayıtları. Faz 2.3'te REST client buraya eklenecek.</summary>
    public static IServiceCollection AddGeminiIntegration(this IServiceCollection services)
    {
        services.AddOptions<GeminiOptions>().BindConfiguration(GeminiOptions.SectionName);
        return services;
    }
}
