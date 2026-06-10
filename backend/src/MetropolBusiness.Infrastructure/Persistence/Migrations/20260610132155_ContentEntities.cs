using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MetropolBusiness.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ContentEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "announcements",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: true),
                    cover_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_announcements", x => x.id);
                    table.ForeignKey(
                        name: "fk_announcements_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "surveys",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    single_response = table.Column<bool>(type: "boolean", nullable: false),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_surveys", x => x.id);
                    table.ForeignKey(
                        name: "fk_surveys_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "videos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    thumbnail_url = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    duration_seconds = table.Column<int>(type: "integer", nullable: false),
                    mandatory = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_videos", x => x.id);
                    table.ForeignKey(
                        name: "fk_videos_tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "announcement_segments",
                columns: table => new
                {
                    announcement_id = table.Column<Guid>(type: "uuid", nullable: false),
                    segment_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_announcement_segments", x => new { x.announcement_id, x.segment_id });
                    table.ForeignKey(
                        name: "fk_announcement_segments_announcements_announcement_id",
                        column: x => x.announcement_id,
                        principalTable: "announcements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_announcement_segments_segments_segment_id",
                        column: x => x.segment_id,
                        principalTable: "segments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_questions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    text = table.Column<string>(type: "text", nullable: false),
                    options = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_survey_questions", x => x.id);
                    table.ForeignKey(
                        name: "fk_survey_questions_surveys_survey_id",
                        column: x => x.survey_id,
                        principalTable: "surveys",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_responses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    answers = table.Column<string>(type: "jsonb", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_survey_responses", x => x.id);
                    table.ForeignKey(
                        name: "fk_survey_responses_surveys_survey_id",
                        column: x => x.survey_id,
                        principalTable: "surveys",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_survey_responses_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "video_watches",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    video_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    watched = table.Column<bool>(type: "boolean", nullable: false),
                    progress_seconds = table.Column<int>(type: "integer", nullable: false),
                    watched_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_video_watches", x => x.id);
                    table.ForeignKey(
                        name: "fk_video_watches_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_video_watches_videos_video_id",
                        column: x => x.video_id,
                        principalTable: "videos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_announcement_segments_segment_id",
                table: "announcement_segments",
                column: "segment_id");

            migrationBuilder.CreateIndex(
                name: "ix_announcements_tenant_id",
                table: "announcements",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_survey_questions_survey_id_order",
                table: "survey_questions",
                columns: new[] { "survey_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_survey_responses_survey_id_user_id",
                table: "survey_responses",
                columns: new[] { "survey_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_survey_responses_user_id",
                table: "survey_responses",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_surveys_tenant_id",
                table: "surveys",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_watches_user_id",
                table: "video_watches",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_video_watches_video_id_user_id",
                table: "video_watches",
                columns: new[] { "video_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_videos_tenant_id",
                table: "videos",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "announcement_segments");

            migrationBuilder.DropTable(
                name: "survey_questions");

            migrationBuilder.DropTable(
                name: "survey_responses");

            migrationBuilder.DropTable(
                name: "video_watches");

            migrationBuilder.DropTable(
                name: "announcements");

            migrationBuilder.DropTable(
                name: "surveys");

            migrationBuilder.DropTable(
                name: "videos");
        }
    }
}
