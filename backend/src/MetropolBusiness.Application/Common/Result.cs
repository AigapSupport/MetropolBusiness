namespace MetropolBusiness.Application.Common;

/// <summary>
/// Beklenen (iş kuralı) hatası: hata zarfı alanları + HTTP status kodu.
/// Beklenen hatalar exception ile değil bu tiple taşınır (CLAUDE.md §7: exception ile akış kontrolü yok).
/// Code değerleri <see cref="ErrorCodes"/> sabitlerinden gelir; Message kullanıcıya gösterilebilir Türkçe metindir.
/// </summary>
public sealed record Error(string Code, string Message, int HttpStatus, object? Details = null);

/// <summary>
/// Use-case sonucu: başarı + değer ya da beklenen hata.
/// Api katmanında ResultToActionResult uzantısıyla HTTP yanıtına çevrilir (API_CONTRACT §0.2 zarfı).
/// </summary>
public sealed class Result<T>
{
    private readonly T? _value;

    private Result(bool isSuccess, T? value, Error? error)
    {
        IsSuccess = isSuccess;
        _value = value;
        Error = error;
    }

    /// <summary>True ise <see cref="Value"/> dolu, false ise <see cref="Error"/> dolu.</summary>
    public bool IsSuccess { get; }

    /// <summary>Başarı değeri; başarısız sonuçta erişmek programlama hatasıdır.</summary>
    public T Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException(
            "Başarısız sonucun değeri okunamaz; önce IsSuccess kontrol edilmelidir.");

    /// <summary>Beklenen hata; başarılı sonuçta null.</summary>
    public Error? Error { get; }

    /// <summary>Başarılı sonuç üretir.</summary>
    public static Result<T> Ok(T value) => new(true, value, null);

    /// <summary>Beklenen hata sonucu üretir.</summary>
    public static Result<T> Fail(Error error) => new(false, default, error);
}
