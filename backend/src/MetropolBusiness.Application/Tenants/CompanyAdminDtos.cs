namespace MetropolBusiness.Application.Tenants;

// Firma admin kullanıcı/segment DTO'ları — docs/API_CONTRACT.md §12.
// Tüm işlemler company_admin rolü ve KENDİ tenant'ı ile sınırlıdır (CLAUDE.md kural 1).
// Telefon firma admin'e maskesiz gösterilir (PANELS_SPEC A.3 "maskeli ops." — kendi çalışanı).

/// <summary>Kullanıcının bağlı olduğu segment özeti (etiket gösterimi için).</summary>
public sealed record CompanyUserSegmentDto(Guid Id, string Name);

/// <summary>Firma admin kullanıcı listesi satırı (GET /admin/company/users).</summary>
public sealed record CompanyUserDto(
    Guid Id,
    string? FirstName,
    string? LastName,
    string Phone,
    string? Email,
    string Role,
    string Status,
    IReadOnlyList<CompanyUserSegmentDto> Segments);

/// <summary>
/// Kullanıcı davet/ekle (POST). Telefon zorunlu (login OTP anahtarı) ve tenant içinde
/// benzersiz; role null = enduser. SegmentIds null/boş = segmentsiz başlar.
/// </summary>
public sealed record CompanyUserCreateRequest(
    string Phone,
    string? FirstName,
    string? LastName,
    string? Email,
    string? Role,
    List<Guid>? SegmentIds);

/// <summary>
/// Kullanıcı güncelle (PUT). null alan = değiştirme; status "active|passive" ile
/// aktifleştir/pasifleştir de buradan yapılır. Telefon değişimi bilinçli olarak yok
/// (login anahtarıdır; ayrı doğrulamalı akış gerektirir).
/// </summary>
public sealed record CompanyUserUpdateRequest(
    string? FirstName,
    string? LastName,
    string? Email,
    string? Role,
    string? Status);

/// <summary>PUT /admin/company/users/{id}/segments isteği: { segmentIds } (komple değişim).</summary>
public sealed record UserSegmentsUpdateRequest(List<Guid> SegmentIds);

/// <summary>Segment görünümü — kullanıcı sayısı + yetkili modül kodlarıyla.</summary>
public sealed record CompanySegmentDto(
    Guid Id,
    string Name,
    int UserCount,
    IReadOnlyList<string> ModuleCodes);

/// <summary>Segment oluştur/güncelle isteği.</summary>
public sealed record SegmentUpsertRequest(string Name);

/// <summary>PUT /admin/company/segments/{id}/modules isteği: { moduleCodes } (komple değişim).</summary>
public sealed record SegmentModulesUpdateRequest(List<string> ModuleCodes);
