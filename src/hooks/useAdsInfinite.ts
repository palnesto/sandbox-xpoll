import { useInfiniteQuery } from "@tanstack/react-query";
import apiInstance from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";

export type AdApi = {
  _id: string;
  title: string;
  description: string;
  uploadedImageLinks?: string[];
  hyperlink?: string | null;
  buttonText?: string | null;
};

type AdsApiResponse = {
  statusCode: number;
  data: {
    total: number;
    entries: AdApi[];
  };
  message?: string;
  success?: boolean;
};

export type AdsInfinitePage = {
  entries: AdApi[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number; // 0 when total=0
  };
};

export function useAdsInfinite(
  filters: Record<string, unknown> | undefined,
  pageSize = 20,
  opts?: { enabled?: boolean }, // ✅ NEW
) {
  const route = endpoints.ad.ad.advancedListing;

  return useInfiniteQuery({
    queryKey: [route, filters, pageSize] as const,

    enabled: opts?.enabled ?? true, // ✅ NEW (prevents call when false)

    queryFn: async ({ pageParam = 1, signal }) => {
      const params = {
        page: pageParam,
        pageSize,
        status: "live",
        ...(filters ?? {}),
      };

      const res = await apiInstance.get<AdsApiResponse>(route, {
        params,
        signal,
      });

      const total = res.data.data.total ?? 0;
      const entries = res.data.data.entries ?? [];
      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

      const page: AdsInfinitePage = {
        entries,
        meta: {
          total,
          page: Number(pageParam),
          pageSize,
          totalPages,
        },
      };

      return page;
    },

    getNextPageParam: (last) => {
      const { totalPages, page } = last.meta;
      if (totalPages <= 1) return undefined;
      return page < totalPages ? page + 1 : 1;
    },

    initialPageParam: 1,
    keepPreviousData: true,
    refetchOnReconnect: false,

    select: (data) => {
      const MAX_PAGES_TO_KEEP = 3;
      if (!data?.pages?.length) return data;

      const pages = data.pages.slice(-MAX_PAGES_TO_KEEP);
      const pageParams = data.pageParams.slice(-MAX_PAGES_TO_KEEP);

      return { ...data, pages, pageParams };
    },
  });
}
