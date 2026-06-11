using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Content;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>Platform admin GLOBAL duyuru uçları (API_CONTRACT §13, tenant_id=null).</summary>
[ApiController]
[Route("api/v1/platform/announcements")]
[Authorize(Policy = PolicyNames.PlatformAdmin)]
public class PlatformContentController(IPlatformContentService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAnnouncements(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        Ok(await service.GetAnnouncementsAsync(page, pageSize, ct));

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] AnnouncementUpsertRequest request, CancellationToken ct) =>
        (await service.CreateAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id, [FromBody] AnnouncementUpsertRequest request, CancellationToken ct) =>
        (await service.UpdateAsync(id, request, ct)).ToActionResult();

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) =>
        (await service.DeleteAsync(id, ct)).ToNoContentResult();
}
