using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Content;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Firma admin içerik uçları (API_CONTRACT §12 İçerik): anket/duyuru/video CRUD +
/// anket sonuçları + video izleme raporu. Tüm uçlar company_admin rolü ve
/// kendi tenant'ıyla sınırlıdır; controller incedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/admin/company")]
[Authorize(Policy = PolicyNames.CompanyAdmin)]
public sealed class CompanyContentController(IContentAdminService contentAdminService) : ControllerBase
{
    // ── Anketler ────────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/surveys — taslaklar dahil tenant anketleri.</summary>
    [HttpGet("surveys")]
    public async Task<IActionResult> GetSurveys(CancellationToken cancellationToken) =>
        (await contentAdminService.GetSurveysAsync(cancellationToken)).ToActionResult();

    /// <summary>GET /admin/company/surveys/{id} — sorularla birlikte.</summary>
    [HttpGet("surveys/{id:guid}")]
    public async Task<IActionResult> GetSurvey(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.GetSurveyAsync(id, cancellationToken)).ToActionResult();

    /// <summary>POST /admin/company/surveys — anket + nested sorular (201).</summary>
    [HttpPost("surveys")]
    public async Task<IActionResult> CreateSurvey(
        SurveyUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.CreateSurveyAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /admin/company/surveys/{id} — yayımla/yayımdan kaldır status alanıyla.</summary>
    [HttpPut("surveys/{id:guid}")]
    public async Task<IActionResult> UpdateSurvey(
        Guid id, SurveyUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.UpdateSurveyAsync(id, request, cancellationToken)).ToActionResult();

    /// <summary>DELETE /admin/company/surveys/{id} — 204.</summary>
    [HttpDelete("surveys/{id:guid}")]
    public async Task<IActionResult> DeleteSurvey(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.DeleteSurveyAsync(id, cancellationToken)).ToNoContentResult();

    /// <summary>GET /admin/company/surveys/{id}/results — soru bazında dağılım.</summary>
    [HttpGet("surveys/{id:guid}/results")]
    public async Task<IActionResult> GetSurveyResults(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.GetSurveyResultsAsync(id, cancellationToken)).ToActionResult();

    // ── Duyurular ───────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/announcements — yalnız kendi tenant'ın duyuruları.</summary>
    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements(CancellationToken cancellationToken) =>
        (await contentAdminService.GetAnnouncementsAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /admin/company/announcements — segment hedefli duyuru (201).</summary>
    [HttpPost("announcements")]
    public async Task<IActionResult> CreateAnnouncement(
        AnnouncementUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.CreateAnnouncementAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /admin/company/announcements/{id}.</summary>
    [HttpPut("announcements/{id:guid}")]
    public async Task<IActionResult> UpdateAnnouncement(
        Guid id, AnnouncementUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.UpdateAnnouncementAsync(id, request, cancellationToken)).ToActionResult();

    /// <summary>DELETE /admin/company/announcements/{id} — 204.</summary>
    [HttpDelete("announcements/{id:guid}")]
    public async Task<IActionResult> DeleteAnnouncement(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.DeleteAnnouncementAsync(id, cancellationToken)).ToNoContentResult();

    // ── Videolar ────────────────────────────────────────────────────────────

    /// <summary>GET /admin/company/videos.</summary>
    [HttpGet("videos")]
    public async Task<IActionResult> GetVideos(CancellationToken cancellationToken) =>
        (await contentAdminService.GetVideosAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /admin/company/videos — 201.</summary>
    [HttpPost("videos")]
    public async Task<IActionResult> CreateVideo(
        VideoUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.CreateVideoAsync(request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>PUT /admin/company/videos/{id}.</summary>
    [HttpPut("videos/{id:guid}")]
    public async Task<IActionResult> UpdateVideo(
        Guid id, VideoUpsertRequest request, CancellationToken cancellationToken) =>
        (await contentAdminService.UpdateVideoAsync(id, request, cancellationToken)).ToActionResult();

    /// <summary>DELETE /admin/company/videos/{id} — 204.</summary>
    [HttpDelete("videos/{id:guid}")]
    public async Task<IActionResult> DeleteVideo(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.DeleteVideoAsync(id, cancellationToken)).ToNoContentResult();

    /// <summary>GET /admin/company/videos/{id}/watch-report — kullanıcı bazlı izleme listesi.</summary>
    [HttpGet("videos/{id:guid}/watch-report")]
    public async Task<IActionResult> GetVideoWatchReport(Guid id, CancellationToken cancellationToken) =>
        (await contentAdminService.GetVideoWatchReportAsync(id, cancellationToken)).ToActionResult();
}
