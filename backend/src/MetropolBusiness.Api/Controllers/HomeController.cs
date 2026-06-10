using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Content;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>
/// Ana Sayfa içerik uçları (API_CONTRACT §3): duyuru + anket + video.
/// Tenant izolasyonu query filter'larda, kullanıcı kimliği ITenantContext.UserId'den;
/// controller incedir, tüm iş kuralı IContentService'tedir (CLAUDE.md §7).
/// </summary>
[ApiController]
[Route("api/v1/home")]
[Authorize(Policy = PolicyNames.TenantUser)]
public sealed class HomeController(IContentService contentService) : ControllerBase
{
    /// <summary>GET /home/announcements — firma + global duyurular, sayfalı zarf (§0.4).</summary>
    [HttpGet("announcements")]
    public async Task<IActionResult> GetAnnouncements(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        (await contentService.GetAnnouncementsAsync(page, pageSize, cancellationToken)).ToActionResult();

    /// <summary>GET /home/announcements/{id} — tek duyuru detayı.</summary>
    [HttpGet("announcements/{id:guid}")]
    public async Task<IActionResult> GetAnnouncement(Guid id, CancellationToken cancellationToken) =>
        (await contentService.GetAnnouncementAsync(id, cancellationToken)).ToActionResult();

    /// <summary>GET /home/surveys — yayında olan anketler (completed bayrağıyla).</summary>
    [HttpGet("surveys")]
    public async Task<IActionResult> GetSurveys(CancellationToken cancellationToken) =>
        (await contentService.GetSurveysAsync(cancellationToken)).ToActionResult();

    /// <summary>GET /home/surveys/{id} — sorularla birlikte anket detayı.</summary>
    [HttpGet("surveys/{id:guid}")]
    public async Task<IActionResult> GetSurvey(Guid id, CancellationToken cancellationToken) =>
        (await contentService.GetSurveyAsync(id, cancellationToken)).ToActionResult();

    /// <summary>POST /home/surveys/{id}/responses — 201; tekrar yanıt 409 SURVEY_ALREADY_ANSWERED.</summary>
    [HttpPost("surveys/{id:guid}/responses")]
    public async Task<IActionResult> SubmitSurveyResponse(
        Guid id, SurveyResponseRequest request, CancellationToken cancellationToken) =>
        (await contentService.SubmitSurveyResponseAsync(id, request, cancellationToken))
            .ToActionResult(StatusCodes.Status201Created);

    /// <summary>GET /home/videos — kullanıcı bazlı watched/progressSeconds ile.</summary>
    [HttpGet("videos")]
    public async Task<IActionResult> GetVideos(CancellationToken cancellationToken) =>
        (await contentService.GetVideosAsync(cancellationToken)).ToActionResult();

    /// <summary>POST /home/videos/{id}/watch — izleme durumu upsert, 200 güncel durum.</summary>
    [HttpPost("videos/{id:guid}/watch")]
    public async Task<IActionResult> UpsertVideoWatch(
        Guid id, VideoWatchRequest request, CancellationToken cancellationToken) =>
        (await contentService.UpsertVideoWatchAsync(id, request, cancellationToken)).ToActionResult();
}
