using System.Globalization;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Identity;

/// <summary>
/// PostgreSQL sequence tabanlı MemberId üretici (MemberIdSequence migration'ı
/// 'member_id_seq'i oluşturur, 10001'den başlar). Sequence çakışmasız ve kısadır;
/// SQLite testleri bu sınıfı KULLANMAZ (fake enjekte edilir — nextval Postgres'e özgü).
/// </summary>
public sealed class DbSequenceMemberIdGenerator(AppDbContext dbContext) : IMemberIdGenerator
{
    public async Task<string> NextAsync(CancellationToken cancellationToken = default)
    {
        var value = await dbContext.Database
            .SqlQueryRaw<long>("SELECT nextval('member_id_seq') AS \"Value\"")
            .SingleAsync(cancellationToken);
        return value.ToString(CultureInfo.InvariantCulture);
    }
}
