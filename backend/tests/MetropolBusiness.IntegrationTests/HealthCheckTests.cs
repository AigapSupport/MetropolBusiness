using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace MetropolBusiness.IntegrationTests;

public class HealthCheckTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Health_endpoint_returns_200()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
