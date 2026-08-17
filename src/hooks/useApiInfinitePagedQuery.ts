import {
  useInfiniteQuery,
  UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import apiInstance, { BASE_URL } from "@/api/queryClient";

/**
 * Matches your API envelope:
 * {
 *   statusCode: 200,
 *   data: { total: number, entries: T[] },
 *   message: "success",
 *   success: true
 * }
 */
export type ApiEnvelope<T> = {
  statusCode: number;
  data: T;
  message?: string;
  success?: boolean;
};

export type PagedResult<T> = {
  total: number;
  entries: T[];
};

export type InfinitePagedConfig<TFilters extends Record<string, any>> = {
  route: string; // e.g. endpoints.campaigns.all
  filters?: TFilters; // e.g. { status: "live", isPolitical: true }
  pageSize?: number; // default 12
};

/** Safely unwrap helpers */
function getEntries<T>(
  page: AxiosResponse<ApiEnvelope<PagedResult<T>>> | undefined
): T[] {
  return (page?.data?.data?.entries ?? []) as T[];
}
function getTotal<T>(
  page: AxiosResponse<ApiEnvelope<PagedResult<T>>> | undefined
): number {
  return (page?.data?.data?.total ?? 0) as number;
}

/**
 * Standardized infinite loader for any listPaged-backed endpoint.
 */
export function useApiInfinitePagedQuery<
  TEntry = any,
  TFilters extends Record<string, any> = Record<string, any>
>(
  config: InfinitePagedConfig<TFilters>,
  options?: Omit<
    UseInfiniteQueryOptions<
      AxiosResponse<ApiEnvelope<PagedResult<TEntry>>>,
      any,
      AxiosResponse<ApiEnvelope<PagedResult<TEntry>>>,
      AxiosResponse<ApiEnvelope<PagedResult<TEntry>>>,
      any[],
      number
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >
) {
  const { route, filters, pageSize = 12 } = config;

  const query = useInfiniteQuery({
    queryKey: [route, filters ?? {}, pageSize],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      // NOTE: you currently do `${BASE_URL}${route}` elsewhere.
      // Keeping same strategy for consistency with your codebase.
      return apiInstance.get(`${BASE_URL}${route}`, {
        signal,
        params: {
          ...(filters ?? {}),
          page: pageParam,
          pageSize,
        },
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      const total = getTotal<TEntry>(lastPage);
      const loaded = allPages.reduce(
        (sum, p) => sum + getEntries<TEntry>(p).length,
        0
      );
      if (loaded >= total) return undefined;
      return allPages.length + 1; // next page index (1-based)
    },
    ...options,
  });

  const items = query.data?.pages.flatMap((p) => getEntries<TEntry>(p)) ?? [];
  const total = query.data?.pages?.length
    ? getTotal<TEntry>(query.data.pages[0])
    : 0;

  return {
    ...query,
    items,
    total,
    loaded: items.length,
  };
}
