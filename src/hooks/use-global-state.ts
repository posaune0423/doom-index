import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { GlobalState } from "@/types/domain";
import { logger } from "@/utils/logger";

const fetchGlobalState = async (): Promise<GlobalState | null> => {
  logger.info("use-global-state.fetchGlobalState.start");

  const response = await fetch("/api/r2/state/global.json");

  if (!response.ok) {
    if (response.status === 404) {
      logger.info("use-global-state.fetchGlobalState.notFound", { response: response.status });
      return null;
    }

    logger.error("use-global-state.fetchGlobalState.error", { response: response.status });
    throw new Error(`Failed to fetch global state: ${response.status}`);
  }

  const data = (await response.json()) as GlobalState;
  logger.info("use-global-state.fetchGlobalState.success", {
    imageUrl: data?.imageUrl ?? null,
    lastTs: data?.lastTs ?? null,
    prevHash: data?.prevHash ?? null,
  });

  return data;
};

export const useGlobalState = () => {
  const previousImageUrlRef = useRef<string | null | undefined>(undefined);

  const queryResult = useQuery<GlobalState | null, Error>({
    queryKey: ["global-state"],
    queryFn: fetchGlobalState,
    staleTime: 0, // Always consider data stale to allow refetchInterval to work
    refetchInterval: 60000, // Refetch every minute
    retry: 5,
  });

  // log data updates
  useEffect(() => {
    const currentImageUrl = queryResult.data?.imageUrl;

    // skip on initial render
    if (previousImageUrlRef.current === undefined) {
      previousImageUrlRef.current = currentImageUrl;
      return;
    }

    // log only when imageUrl changes
    if (previousImageUrlRef.current !== currentImageUrl) {
      logger.info("use-global-state.dataUpdated", {
        previousImageUrl: previousImageUrlRef.current ?? null,
        currentImageUrl: currentImageUrl ?? null,
        lastTs: queryResult.data?.lastTs ?? null,
      });
      previousImageUrlRef.current = currentImageUrl;
    }
  }, [queryResult.data]);

  return queryResult;
};

// helper function to refetch the global state immediately
// ignore staleTime and refetch immediately
export const useGlobalStateRefetch = () => {
  const { refetch } = useGlobalState();

  return async () => {
    logger.info("use-global-state.refetch.triggered");
    const result = await refetch({ cancelRefetch: false });
    logger.info("use-global-state.refetch.completed", {
      success: result.isSuccess,
      imageUrl: result.data?.imageUrl ?? null,
    });
    return result;
  };
};
