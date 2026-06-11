using MetropolBusiness.Api.Auth;
using MetropolBusiness.Api.Extensions;
using MetropolBusiness.Application.Chat;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MetropolBusiness.Api.Controllers;

/// <summary>Sohbet REST uçları (API_CONTRACT §10) — mesajlaşmanın kendisi SignalR hub'ındadır.</summary>
[ApiController]
[Route("api/v1/chat")]
[Authorize(Policy = PolicyNames.TenantUser)]
public class ChatController(IChatService chat) : ControllerBase
{
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations(CancellationToken ct)
    {
        var result = await chat.GetConversationsAsync(ct);
        return result.IsSuccess ? Ok(new { items = result.Value }) : result.ToActionResult();
    }

    [HttpGet("conversations/{id:guid}/messages")]
    public async Task<IActionResult> GetMessages(
        Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 30,
        CancellationToken ct = default) =>
        (await chat.GetMessagesAsync(id, page, pageSize, ct)).ToActionResult();

    [HttpPost("conversations")]
    public async Task<IActionResult> CreateConversation(
        [FromBody] CreateConversationRequest request, CancellationToken ct) =>
        (await chat.CreateConversationAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpGet("assistants")]
    public async Task<IActionResult> GetAssistants(CancellationToken ct) =>
        Ok(new { items = await chat.GetAssistantsAsync(ct) });

    /// <summary>Asistanı firma admin tanımlar (PRD §17.2).</summary>
    [HttpPost("assistants")]
    [Authorize(Policy = PolicyNames.CompanyAdmin)]
    public async Task<IActionResult> CreateAssistant(
        [FromBody] CreateAssistantRequest request, CancellationToken ct) =>
        (await chat.CreateAssistantAsync(request, ct)).ToActionResult(StatusCodes.Status201Created);

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers(
        [FromQuery] string? q, CancellationToken ct) =>
        Ok(new { items = await chat.SearchUsersAsync(q, ct) });
}
