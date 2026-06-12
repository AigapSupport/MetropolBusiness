namespace MetropolBusiness.Application.Common;

/// <summary>
/// Metropol üye numarası (MemberId) üretici. KARAR 2026-06-12: kısa SAYISAL ve
/// benzersiz değer üretilir (DB sequence, "10001"den başlar) — önceki 32-hex Guid
/// biçimi Metropol tarafında reddedildi (AddAccountConfirm 9001, LESSONS.md);
/// dökümandaki örnekler kısa sayısaldır ("3299"). Dolu MemberId'ye DOKUNULMAZ —
/// üretici yalnızca boş olanlar için çağrılır.
/// </summary>
public interface IMemberIdGenerator
{
    Task<string> NextAsync(CancellationToken cancellationToken = default);
}
