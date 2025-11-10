import { useQuery } from "@tanstack/react-query";
import type { McMap } from "@/types/domain";

interface McResponse {
  tokens: McMap;
  generatedAt: string;
}

const fetchMc = async (): Promise<McResponse> => {
  const response = await fetch("/api/mc");

  if (!response.ok) {
    throw new Error(`Failed to fetch MC: ${response.status}`);
  }

  return response.json();
};

export const useMc = () => {
  return useQuery<McResponse, Error>({
    queryKey: ["mc"],
    queryFn: fetchMc,
    refetchInterval: 10000,
    staleTime: 10000,
    retry: 1,
  });
};
