using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MetropolBusiness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class CardBalancesAndMemberId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "card_balances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    wallet_id = table.Column<int>(type: "integer", nullable: false),
                    wallet_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    balance = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_card_balances", x => x.id);
                    table.ForeignKey(
                        name: "fk_card_balances_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_card_balances_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_card_balances_card_id",
                table: "card_balances",
                column: "card_id");

            migrationBuilder.CreateIndex(
                name: "ix_card_balances_card_id_wallet_id",
                table: "card_balances",
                columns: new[] { "card_id", "wallet_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_card_balances_tenant_id",
                table: "card_balances",
                column: "tenant_id");

            // KARAR 2026-06-11: her kullanıcının bir Metropol MemberId'si olur. Mevcut
            // MemberId'siz kullanıcılara Id'nin 32 hex hali backfill edilir (yeni kayıtlar
            // User.EnsureMemberId ile servis katmanında alır). Dolu member_id'ye DOKUNULMAZ.
            migrationBuilder.Sql(
                "UPDATE users SET member_id = REPLACE(id::text, '-', '') " +
                "WHERE member_id IS NULL OR member_id = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "card_balances");
        }
    }
}
