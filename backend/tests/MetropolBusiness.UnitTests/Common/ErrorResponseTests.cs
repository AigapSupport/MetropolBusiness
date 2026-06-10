using System.Text.Json;
using MetropolBusiness.Application.Common;

namespace MetropolBusiness.UnitTests.Common;

public class ErrorResponseTests
{
    [Fact]
    public void Serializes_to_contract_envelope_with_camel_case_keys()
    {
        // docs/API_CONTRACT.md §0.2: { "code", "message", "details" }
        var error = new ErrorResponse(ErrorCodes.OtpInvalid, "OTP yanlış", new { attemptsLeft = 2 });

        var json = JsonSerializer.Serialize(error, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        Assert.Contains("\"code\":\"OTP_INVALID\"", json);
        Assert.Contains("\"message\":\"OTP yanl", json);
        Assert.Contains("\"attemptsLeft\":2", json);
    }

    [Fact]
    public void Details_is_optional_and_defaults_to_null()
    {
        var error = new ErrorResponse(ErrorCodes.NotFound, "Kayıt yok");

        Assert.Null(error.Details);
    }
}
