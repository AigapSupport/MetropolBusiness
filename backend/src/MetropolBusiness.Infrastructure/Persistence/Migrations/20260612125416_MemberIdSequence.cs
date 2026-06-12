using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MetropolBusiness.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// KARAR 2026-06-12: Metropol MemberId kısa SAYISAL sequence değerine geçti —
    /// önceki 32-hex Guid biçimi Metropol AddAccountConfirm'de reddedildi (LESSONS.md).
    /// Backfill: yalnız bizim ürettiğimiz 32 karakterlik değerler sequence değeriyle
    /// değiştirilir; elle atanmış (kısa) MemberId'lere DOKUNULMAZ.
    /// </summary>
    public partial class MemberIdSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("CREATE SEQUENCE IF NOT EXISTS member_id_seq START WITH 10001;");
            migrationBuilder.Sql(
                "UPDATE users SET member_id = nextval('member_id_seq')::text " +
                "WHERE member_id IS NOT NULL AND length(member_id) = 32;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Backfill geri alınmaz (eski 32-hex değerler bilinçli terk edildi).
            migrationBuilder.Sql("DROP SEQUENCE IF EXISTS member_id_seq;");
        }
    }
}
