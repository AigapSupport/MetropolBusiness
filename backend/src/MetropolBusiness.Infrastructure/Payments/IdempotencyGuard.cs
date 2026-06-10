using System.Text.Json;
using MetropolBusiness.Application.Common;
using MetropolBusiness.Domain.Entities;
using MetropolBusiness.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace MetropolBusiness.Infrastructure.Payments;

/// <summary>
/// Para uçlarının (SaleConfirm/BalanceTransfer) ortak idempotency akışı (ARCHITECTURE §5.3):
/// (tenant, Idempotency-Key) payment_idempotency'de aranır —
///   success → kayıtlı yanıt anlık görüntüsü AYNEN döner (Metropol'e GİDİLMEZ),
///   failed  → kayıtlı hata AYNEN döner (aynı SaleRefCode/ConsumerRefCode tekrar gönderilmez),
///   pending → 409 DUPLICATE_OPERATION (işlem sürüyor),
///   yok     → pending yazılır; UNIQUE(tenant_id, idempotency_key) ihlali = yarış kaybedildi → 409.
/// Tenant izolasyonu PaymentIdempotency query filter'ındadır; anahtar BAŞKA kullanıcının/işlemin
/// kaydına denk gelirse anlık görüntü SIZDIRILMAZ (409 döner).
/// </summary>
internal static class IdempotencyGuard
{
    public const string SaleConfirmOperation = "sale_confirm";
    public const string BalanceTransferOperation = "balance_transfer";

    public const string PendingStatus = "pending";
    public const string SuccessStatus = "success";
    public const string FailedStatus = "failed";

    private static readonly JsonSerializerOptions JsonWeb = new(JsonSerializerDefaults.Web);

    /// <summary>Süren işlem yanıtı (ARCHITECTURE §5.3 "pending → çakışma/bekleme").</summary>
    private static readonly Error PendingError = new(
        ErrorCodes.DuplicateOperation,
        "Bu işlem zaten işleniyor; lütfen sonucunu bekleyin.",
        409,
        new { reason = "pending" });

    /// <summary>Anahtar başka kullanıcı/işlem türüyle kullanılmış — anlık görüntü sızdırılmaz.</summary>
    private static readonly Error KeyReusedError = new(
        ErrorCodes.DuplicateOperation,
        "Bu Idempotency-Key başka bir işlemde kullanılmış.",
        409,
        new { reason = "key_reused" });

    /// <summary>Başarısız yanıtın saklanan anlık görüntüsü (tekrar istekte aynen üretilir).</summary>
    private sealed record FailureSnapshot(string Code, string Message, int HttpStatus, int? ProviderCode);

    /// <summary>(tenant, key) kaydını arar — tenant filtresi query filter'dan gelir.</summary>
    public static Task<PaymentIdempotency?> FindAsync(
        AppDbContext dbContext, string idempotencyKey, CancellationToken cancellationToken) =>
        dbContext.PaymentIdempotencies
            .FirstOrDefaultAsync(p => p.IdempotencyKey == idempotencyKey, cancellationToken);

    /// <summary>
    /// Mevcut kaydı bizim yanıta çevirir: success → kayıtlı DTO, failed → kayıtlı hata,
    /// pending → 409. Kullanıcı/işlem uyuşmazlığında anlık görüntü dönülmez (409).
    /// </summary>
    public static Result<TResponse> Replay<TResponse>(
        PaymentIdempotency record, Guid userId, string operation)
    {
        if (record.UserId != userId || record.Operation != operation)
        {
            return Result<TResponse>.Fail(KeyReusedError);
        }

        return record.Status switch
        {
            SuccessStatus when record.ResponseSnapshotJson is not null =>
                Result<TResponse>.Ok(
                    JsonSerializer.Deserialize<TResponse>(record.ResponseSnapshotJson, JsonWeb)!),
            FailedStatus => Result<TResponse>.Fail(ToError(record.ResponseSnapshotJson)),
            _ => Result<TResponse>.Fail(PendingError),
        };
    }

    /// <summary>
    /// Pending kaydı yazar. UNIQUE(tenant_id, idempotency_key) ihlali eşzamanlı yarışın
    /// kaybedildiği anlamına gelir → 409 (ikinci istek Metropol'e hiç gitmez).
    /// </summary>
    public static async Task<Result<PaymentIdempotency>> CreatePendingAsync(
        AppDbContext dbContext, Guid userId, string idempotencyKey, string operation,
        string? refCode, CancellationToken cancellationToken)
    {
        var record = new PaymentIdempotency
        {
            UserId = userId,
            IdempotencyKey = idempotencyKey,
            Operation = operation,
            RefCode = refCode,
            Status = PendingStatus,
        };

        dbContext.PaymentIdempotencies.Add(record);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Yarış kaybedildi: aynı anahtar eşzamanlı yazıldı — kazanan işlem sürüyor.
            dbContext.Entry(record).State = EntityState.Detached;
            return Result<PaymentIdempotency>.Fail(PendingError);
        }

        return Result<PaymentIdempotency>.Ok(record);
    }

    /// <summary>Başarılı yanıtı anlık görüntü olarak yazar (tekrar istekte AYNEN döner).</summary>
    public static Task MarkSuccessAsync<TResponse>(
        AppDbContext dbContext, PaymentIdempotency record, TResponse response,
        CancellationToken cancellationToken)
    {
        record.Status = SuccessStatus;
        record.ResponseSnapshotJson = JsonSerializer.Serialize(response, JsonWeb);
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Metropol hatasını anlık görüntü olarak yazar: aynı anahtarla tekrar istek aynı
    /// hatayı döner — başarısız SaleRefCode/ConsumerRefCode tekrar GÖNDERİLMEZ (CLAUDE.md §6).
    /// </summary>
    public static Task MarkFailedAsync(
        AppDbContext dbContext, PaymentIdempotency record, Error error, int? providerCode,
        CancellationToken cancellationToken)
    {
        record.Status = FailedStatus;
        record.ResponseSnapshotJson = JsonSerializer.Serialize(
            new FailureSnapshot(error.Code, error.Message, error.HttpStatus, providerCode), JsonWeb);
        return dbContext.SaveChangesAsync(cancellationToken);
    }

    private static Error ToError(string? snapshotJson)
    {
        var snapshot = snapshotJson is null
            ? null
            : JsonSerializer.Deserialize<FailureSnapshot>(snapshotJson, JsonWeb);
        if (snapshot is null)
        {
            // Bozuk/eksik anlık görüntü: güvenli tarafta genel çakışma yanıtı.
            return KeyReusedError;
        }

        return new Error(
            snapshot.Code,
            snapshot.Message,
            snapshot.HttpStatus,
            snapshot.ProviderCode is null ? null : new { providerCode = snapshot.ProviderCode });
    }
}
