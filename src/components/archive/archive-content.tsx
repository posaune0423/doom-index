"use client";

import { useArchive } from "@/hooks/use-archive";
import { useImagePreload } from "@/hooks/use-image-preload";
import { PaginationControls } from "./pagination-controls";
import { ArchiveGrid } from "./archive-grid";
import { ArchiveScene } from "./archive-scene";
import { ArchivePaintingsGrid } from "./archive-paintings-grid";
import { ArchiveZoomView } from "./archive-zoom-view";
import { DateFilter } from "./date-filter";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState, useEffect } from "react";
import type { ArchiveItem } from "@/types/archive";

interface ArchiveContentProps {
  initialCursor?: string;
  startDate?: string;
  endDate?: string;
}

export const ArchiveContent: React.FC<ArchiveContentProps> = ({ initialCursor, startDate, endDate }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedItem, setSelectedItem] = useState<ArchiveItem | null>(null);
  const currentCursor = searchParams.get("cursor") || initialCursor;

  const { data, error, isLoading, refetch, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useArchive({
    cursor: currentCursor,
    startDate,
    endDate,
  });

  // Reset scroll position when filters change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [startDate, endDate]);

  // Calculate pagination state (must be before early returns)
  const allItems = data?.pages.flatMap(page => page.items) ?? [];
  const itemsPerPage = 20; // Default limit
  const currentPage = data?.pages.length ?? 1;
  const totalItems = allItems.length + (hasNextPage ? 1 : 0); // Approximate total
  const hasPreviousPage = useMemo(() => {
    return (data?.pages.length ?? 0) > 1;
  }, [data?.pages.length]);

  // Prefetch next page data when current page is fully loaded
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && data?.pages.length) {
      const lastPage = data.pages[data.pages.length - 1];
      if (lastPage?.cursor) {
        // Prefetch next page data in background
        // This uses React Query's cache, so when user clicks "next", data is already cached
        const timeoutId = setTimeout(() => {
          fetchNextPage();
        }, 1000); // Delay to avoid interfering with current page rendering

        return () => clearTimeout(timeoutId);
      }
    }
  }, [hasNextPage, isFetchingNextPage, data?.pages, fetchNextPage]);

  // Preload next page images once next page data is available
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const nextPageImageUrls = useMemo(() => {
    // If we have more than one page, preload images from the last page (next page)
    if (data?.pages.length && data.pages.length > 1) {
      const nextPage = data.pages[data.pages.length - 1];
      return nextPage.items.map(item => item.imageUrl);
    }
    // If we only have one page but there's a next page, preload current page images
    // (they'll be shown when user scrolls or navigates)
    if (data?.pages.length === 1 && hasNextPage) {
      return data.pages[0]?.items.map(item => item.imageUrl) ?? [];
    }
    return [];
  }, [data?.pages, hasNextPage]);

  // Preload images in background
  useImagePreload(nextPageImageUrls);

  // Error state
  if (isError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
        <div className="rounded-lg border border-red-300/30 bg-red-500/10 p-4 text-center text-red-400">
          <h2 className="mb-2 text-xl">Error loading archive</h2>
          <p className="text-sm opacity-90">
            {error instanceof Error ? error.message : "Failed to load archive items"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/15 hover:border-white/30"
        >
          Retry
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-white/70">Loading archive...</p>
      </div>
    );
  }

  // Success state

  const updateURL = (cursor?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (cursor) {
      params.set("cursor", cursor);
    } else {
      params.delete("cursor");
    }
    router.push(`/archive?${params.toString()}`, { scroll: false });
  };

  const handleNext = () => {
    if (hasNextPage && !isFetchingNextPage) {
      const nextCursor = data?.pages[data.pages.length - 1]?.cursor;
      if (nextCursor) {
        updateURL(nextCursor);
      }
      fetchNextPage();
    }
  };

  const handlePrevious = () => {
    if (hasPreviousPage && data && data.pages.length > 1) {
      // Go back to previous page by removing the last page's cursor
      const previousPageIndex = data.pages.length - 2;
      const previousCursor = previousPageIndex >= 0 ? data.pages[previousPageIndex]?.cursor : undefined;
      updateURL(previousCursor);
      // Note: Infinite query doesn't support going back easily, so we refetch
      // In a real implementation, you might want to use regular pagination instead
      refetch();
    }
  };

  return (
    <>
      <div className="relative w-full">
        <ArchiveScene totalItems={totalItems}>
          <ArchivePaintingsGrid items={allItems} onItemClick={setSelectedItem} selectedItem={selectedItem} />
        </ArchiveScene>
      </div>
      <div className="pb-[200px] p-8">
        <h1 className="mb-4">Archive</h1>
        <p className="mb-6 text-white/70">Items: {allItems.length}</p>
        <ArchiveGrid items={allItems} isLoading={isFetchingNextPage} skeletonCount={itemsPerPage} />
      </div>
      <PaginationControls
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        totalItems={totalItems}
        hasNextPage={hasNextPage ?? false}
        hasPreviousPage={hasPreviousPage}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isLoading={isFetchingNextPage}
      />
      <ArchiveZoomView item={selectedItem} onClose={() => setSelectedItem(null)} />
      <DateFilter />
    </>
  );
};
