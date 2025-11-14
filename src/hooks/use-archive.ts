import { useInfiniteQuery } from "@tanstack/react-query";
import { useTRPC, useTRPCClient } from "@/lib/trpc/client";
import type { ArchiveListResponse } from "@/services/archive-list";

interface UseArchiveOptions {
  limit?: number;
  cursor?: string;
  startDate?: string;
  endDate?: string;
}

type PageParam = { cursor?: string } | undefined;

export const useArchive = (options: UseArchiveOptions = {}) => {
  const { limit = 20, cursor, startDate, endDate } = options;
  const trpc = useTRPC();
  const client = useTRPCClient();

  const baseQueryOptions = trpc.archive.list.queryOptions(
    {
      limit,
      cursor,
      startDate,
      endDate,
    },
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  );

  const initialPageParam: PageParam = cursor ? { cursor } : undefined;

  return useInfiniteQuery({
    queryKey: [...baseQueryOptions.queryKey, "infinite"],
    queryFn: async ({ pageParam }: { pageParam: PageParam }): Promise<ArchiveListResponse> => {
      const result = await client.archive.list.query({
        limit,
        startDate,
        endDate,
        cursor: pageParam?.cursor,
      });
      return result as ArchiveListResponse;
    },
    getNextPageParam: (lastPage: ArchiveListResponse): PageParam => {
      if (lastPage.hasMore && lastPage.cursor) {
        return { cursor: lastPage.cursor };
      }
      return undefined;
    },
    initialPageParam,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
