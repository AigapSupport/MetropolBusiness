using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MetropolBusiness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MeAndAdminEndpoints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "preferences",
                table: "users",
                type: "jsonb",
                nullable: false,
                defaultValue: "{}");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "preferences",
                table: "users");
        }
    }
}
