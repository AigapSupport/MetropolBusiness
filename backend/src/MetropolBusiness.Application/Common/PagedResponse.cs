namespace MetropolBusiness.Application.Common;

/// <summary>Sayfalı liste zarfı (API_CONTRACT §0.4): { items, page, pageSize, total }.</summary>
public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

/// <summary>Sayfasız liste zarfı (API_CONTRACT §3): { items }.</summary>
public sealed record ItemsResponse<T>(IReadOnlyList<T> Items);
