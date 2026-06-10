using MetropolBusiness.Application.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace MetropolBusiness.Infrastructure.Persistence;

/// <summary>
/// Yalnızca `dotnet ef` design-time komutları için (migration üretimi).
/// Canlı DB bağlantısı gerektirmez; bağlantı dizesi env'den, yoksa local dev varsayılanı.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
            ?? "Host=localhost;Port=5432;Database=metropolbusiness;Username=metropol;Password=metropol_local_dev";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention()
            .Options;

        return new AppDbContext(options, new DesignTimeTenantContext());
    }

    /// <summary>Design-time'da istek bağlamı yoktur; tenant gerektiren işlem de yoktur.</summary>
    private sealed class DesignTimeTenantContext : ITenantContext
    {
        public Guid? TenantId => null;
        public Guid? UserId => null;
        public bool IsPlatformAdmin => false;
        public Guid RequiredTenantId =>
            throw new InvalidOperationException("Design-time bağlamında tenant yoktur.");
    }
}
