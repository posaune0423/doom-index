"use client";

import React from "react";
import type { ArchiveItem } from "@/types/archive";
import { ArchiveItemComponent } from "./archive-item";
import { ArchiveItemSkeleton } from "./archive-item-skeleton";

interface ArchiveGridProps {
  items: ArchiveItem[];
  isLoading?: boolean;
  skeletonCount?: number;
}

export const ArchiveGrid: React.FC<ArchiveGridProps> = ({ items, isLoading = false, skeletonCount = 20 }) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map(item => (
        <ArchiveItemComponent key={item.id} item={item} />
      ))}
      {isLoading &&
        Array.from({ length: skeletonCount }).map((_, index) => <ArchiveItemSkeleton key={`skeleton-${index}`} />)}
    </div>
  );
};
