export interface PaginationQuery {
  readonly page?: number;
  readonly limit?: number;
}

export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export function paginate<T>(items: readonly T[], query?: PaginationQuery): PaginatedResult<T> {
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.max(1, Math.min(100, query?.limit ?? 20));
  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;

  const startIndex = (page - 1) * limit;
  const data = items.slice(startIndex, startIndex + limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}
