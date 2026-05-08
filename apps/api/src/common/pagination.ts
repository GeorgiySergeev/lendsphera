import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional()
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function getPagination(query: PaginationQuery) {
  const page = query.page;
  const limit = query.limit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit
  };
}

export function listResponse<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    meta: {
      total,
      page,
      limit,
      pageCount: Math.ceil(total / limit)
    }
  };
}
