"use client";

import React from "react";

interface PaginationControlsProps {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  itemsPerPage,
  totalItems,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
  isLoading = false,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const rangeText = totalItems > 0 ? `${startItem}-${endItem} of ${totalItems}` : "0 of 0";

  const isPreviousDisabled = !hasPreviousPage || isLoading;
  const isNextDisabled = !hasNextPage || isLoading;

  return (
    <div className="fixed bottom-[120px] left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-4 rounded-xl border border-white/10 bg-black/80 px-6 py-3 backdrop-blur-xl">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isPreviousDisabled}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
          isPreviousDisabled
            ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40 opacity-50"
            : "border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15"
        }`}
      >
        Previous
      </button>

      <span className="min-w-[120px] text-center text-sm text-white/80">{rangeText}</span>

      <button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled}
        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
          isNextDisabled
            ? "cursor-not-allowed border-white/20 bg-white/5 text-white/40 opacity-50"
            : "border-white/20 bg-white/10 text-white hover:border-white/30 hover:bg-white/15"
        }`}
      >
        Next
      </button>
    </div>
  );
};
