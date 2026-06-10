using MetropolBusiness.Application.Common;

namespace MetropolBusiness.UnitTests.Metropol;

/// <summary>
/// PII maskeleme yardımcıları (CLAUDE.md kural 4 / §10: maskeleme testi zorunlu, ARCHITECTURE §5.4):
/// doküman örnekleri + boş/kısa girdide güvenli davranış (tamamı yıldız).
/// </summary>
public class MaskingTests
{
    // ── Doküman örnekleri ────────────────────────────────────────────────────

    [Fact]
    public void MaskCardNo_matches_contract_example()
    {
        Assert.Equal("637******976", Masking.MaskCardNo("6375354208512976"));
    }

    [Fact]
    public void MaskName_matches_contract_example()
    {
        Assert.Equal("Al*** Te**", Masking.MaskName("Ali Tekin"));
    }

    [Fact]
    public void MaskTckn_matches_contract_example()
    {
        Assert.Equal("11*******11", Masking.MaskTckn("11111111111"));
    }

    [Fact]
    public void MaskPhone_matches_contract_example()
    {
        Assert.Equal("534*****39", Masking.MaskPhone("5345030539"));
    }

    // ── Boş / kısa girdi: güvenli davranış ──────────────────────────────────

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("123456", "******")] // açık karakter bırakmaya yetmeyen uzunluk → tamamı yıldız
    public void MaskCardNo_short_input_is_fully_masked(string? input, string expected)
    {
        Assert.Equal(expected, Masking.MaskCardNo(input));
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("   ", "")]
    [InlineData("Al", "**")]      // 2 harf ve altı kelime tamamen yıldızlanır
    [InlineData("Al Ek", "** **")]
    public void MaskName_short_input_is_fully_masked(string? input, string expected)
    {
        Assert.Equal(expected, Masking.MaskName(input));
    }

    [Fact]
    public void MaskName_masks_every_word_of_longer_names()
    {
        Assert.Equal("Ay*** Fa** Yı**", Masking.MaskName("Ayşegül Fatma Yılmazoğlu"));
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("1234", "****")]
    public void MaskTckn_short_input_is_fully_masked(string? input, string expected)
    {
        Assert.Equal(expected, Masking.MaskTckn(input));
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("53450", "*****")]
    public void MaskPhone_short_input_is_fully_masked(string? input, string expected)
    {
        Assert.Equal(expected, Masking.MaskPhone(input));
    }
}
