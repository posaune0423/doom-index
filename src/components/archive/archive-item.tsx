"use client";

import React, { useState } from "react";
import Image from "next/image";
import type { ArchiveItem } from "@/types/archive";
import { ArchiveItemSkeleton } from "./archive-item-skeleton";
import { logger } from "@/utils/logger";

interface ArchiveItemProps {
  item: ArchiveItem;
}

export const ArchiveItemComponent: React.FC<ArchiveItemProps> = ({ item }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    logger.debug("archive.item.image.loaded", {
      itemId: item.id,
      imageUrl: item.imageUrl,
    });
    setIsLoading(false);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = event.currentTarget;
    const errorDetails = {
      itemId: item.id,
      imageUrl: item.imageUrl,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      currentSrc: img.currentSrc,
      src: img.src,
      complete: img.complete,
    };
    logger.debug("archive.item.image.failed", errorDetails);
    setIsLoading(false);
    setHasError(true);
  };

  logger.debug("archive.item.render", {
    itemId: item.id,
    imageUrl: item.imageUrl,
    isLoading,
    hasError,
  });

  return (
    <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-white/10 bg-black/20 transition-all hover:border-white/20">
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10">
          <ArchiveItemSkeleton />
        </div>
      )}
      {hasError ? (
        <div className="flex h-full w-full items-center justify-center bg-black/40">
          <span className="text-xs text-white/50">Failed to load</span>
        </div>
      ) : (
        <Image
          src={item.imageUrl}
          alt={`Archive item ${item.id}`}
          fill
          className={`object-cover transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  );
};
