import { err, ok, Result } from "neverthrow";
import type { AppError } from "@/types/app-error";
import { resolveR2Bucket, getJsonR2 } from "@/lib/r2";
import type { ArchiveItem, ArchiveMetadata } from "@/types/archive";
import { isValidArchiveFilename, parseDatePrefix, isArchiveMetadata, buildPublicR2Path } from "@/lib/pure/archive";
import { logger } from "@/utils/logger";

type ArchiveListServiceDeps = {
  r2Bucket?: R2Bucket;
};

export type ArchiveListOptions = {
  limit?: number;
  cursor?: string;
  prefix?: string;
  startAfter?: string;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
};

export type ArchiveListResponse = {
  items: ArchiveItem[];
  cursor?: string;
  hasMore: boolean;
};

export type ArchiveListService = {
  /**
   * List images from R2 storage with pagination
   */
  listImages(options: ArchiveListOptions): Promise<Result<ArchiveListResponse, AppError>>;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Build ArchiveItem array from R2Object array with metadata loading
 */
async function buildArchiveItemsWithMetadata(webpObjects: R2Object[], bucket: R2Bucket): Promise<ArchiveItem[]> {
  // Load metadata for all images in parallel
  const metadataPromises = webpObjects.map(async obj => {
    const metadataKey = obj.key.replace(/\.webp$/, ".json");
    const metadataResult = await getJsonR2<ArchiveMetadata>(bucket, metadataKey);

    if (metadataResult.isErr()) {
      logger.warn("archive.metadata.load.failed", {
        imageKey: obj.key,
        metadataKey,
        error: metadataResult.error.message,
      });
      return { obj, metadata: null };
    }

    const metadata = metadataResult.value;
    if (!metadata || !isArchiveMetadata(metadata)) {
      logger.warn("archive.metadata.invalid", {
        imageKey: obj.key,
        metadataKey,
      });
      return { obj, metadata: null };
    }

    return { obj, metadata };
  });

  const metadataResults = await Promise.allSettled(metadataPromises);

  // Build archive items from valid metadata
  const items: ArchiveItem[] = [];

  for (const result of metadataResults) {
    if (result.status === "rejected") {
      logger.error("archive.metadata.load.error", {
        error: result.reason,
      });
      continue;
    }

    const { obj, metadata } = result.value;

    // Skip items without valid metadata
    if (!metadata) {
      continue;
    }

    // Update metadata with correct imageUrl and fileSize from R2 object
    const imageUrl = buildPublicR2Path(obj.key);
    logger.debug("archive.item.built", {
      itemId: metadata.id,
      r2Key: obj.key,
      imageUrl,
      fileSize: obj.size ?? metadata.fileSize,
    });

    const item: ArchiveItem = {
      ...metadata,
      imageUrl,
      fileSize: obj.size ?? metadata.fileSize,
    };

    items.push(item);
  }

  // Sort by timestamp descending (newest first)
  return items.sort((a, b) => {
    const timestampA = a.timestamp || "";
    const timestampB = b.timestamp || "";
    return timestampB.localeCompare(timestampA); // Descending order
  });
}

/**
 * Create archive list service for R2 list operations
 */
export function createArchiveListService({ r2Bucket }: ArchiveListServiceDeps = {}): ArchiveListService {
  let bucket: R2Bucket;
  if (r2Bucket) {
    bucket = r2Bucket;
  } else {
    const bucketResult = resolveR2Bucket();
    if (bucketResult.isErr()) {
      throw new Error(`Failed to resolve R2 bucket: ${bucketResult.error.message}`);
    }
    bucket = bucketResult.value;
  }

  /**
   * Generate date prefixes for a date range
   */
  function generateDatePrefixes(startDate: string, endDate: string): string[] {
    const prefixes: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Iterate through each day in the range
    const current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      prefixes.push(`images/${year}/${month}/${day}/`);

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return prefixes;
  }

  /**
   * Calculate startAfter key for endDate filtering
   * Returns a key that would come after all items on the endDate
   */
  function calculateStartAfterForEndDate(endDate: string): string {
    const date = new Date(endDate);
    date.setDate(date.getDate() + 1); // Next day
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `images/${year}/${month}/${day}/`;
  }

  async function listImages(options: ArchiveListOptions): Promise<Result<ArchiveListResponse, AppError>> {
    try {
      // Validate and set limit
      const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

      // Handle date range filtering
      if (options.startDate && options.endDate) {
        // Generate prefixes for all dates in range
        const datePrefixes = generateDatePrefixes(options.startDate, options.endDate);

        // Execute parallel list operations for each date prefix
        const listPromises = datePrefixes.map(async prefix => {
          const listOptions: R2ListOptions = {
            limit: limit * datePrefixes.length, // Get enough items to cover all dates
            prefix,
          };

          if (options.cursor) {
            listOptions.cursor = options.cursor;
          }

          return bucket.list(listOptions);
        });

        const listResults = await Promise.all(listPromises);

        // Merge all results
        const allObjects = listResults.flatMap(result => result.objects);

        // Filter only .webp files and validate filename pattern
        const webpObjects = allObjects.filter(obj => {
          const filename = obj.key.split("/").pop() || "";
          return filename.endsWith(".webp") && isValidArchiveFilename(filename);
        });

        // Apply endDate filtering using startAfter if needed
        const endDateStartAfter = calculateStartAfterForEndDate(options.endDate);
        const filteredObjects = webpObjects.filter(obj => {
          // Exclude items after endDate
          return obj.key < endDateStartAfter;
        });

        // Build response items with metadata first
        const items = await buildArchiveItemsWithMetadata(filteredObjects, bucket);

        // Sort by timestamp descending (newest first) - already done in buildArchiveItemsWithMetadata
        // Apply limit after sorting
        const limitedItems = items.slice(0, limit);

        // Determine pagination (simplified - would need more complex logic for multi-prefix pagination)
        const hasMore = items.length > limit;

        return ok({
          items: limitedItems,
          cursor: hasMore && limitedItems.length > 0 ? limitedItems[limitedItems.length - 1]?.id : undefined,
          hasMore,
        });
      }

      // Single prefix query (existing logic)
      const listOptions: R2ListOptions = {
        limit,
        prefix: options.prefix ?? "images/",
      };

      if (options.cursor) {
        listOptions.cursor = options.cursor;
      }

      if (options.startAfter) {
        listOptions.startAfter = options.startAfter;
      }

      // Handle single date prefix
      if (options.startDate && !options.endDate) {
        try {
          const datePrefix = parseDatePrefix(options.startDate);
          listOptions.prefix = datePrefix.prefix;
        } catch (error) {
          return err({
            type: "ValidationError",
            message: `Invalid startDate format: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }
      }

      // List objects from R2
      const listResult = await bucket.list(listOptions);

      // Filter only .webp files and validate filename pattern
      const webpObjects = listResult.objects.filter(obj => {
        const filename = obj.key.split("/").pop() || "";
        return filename.endsWith(".webp") && isValidArchiveFilename(filename);
      });

      // Build response items with metadata
      const items = await buildArchiveItemsWithMetadata(webpObjects, bucket);

      // Determine pagination info
      const hasMore = listResult.truncated === true;
      const cursor = hasMore ? listResult.cursor : undefined;

      return ok({
        items,
        cursor,
        hasMore,
      });
    } catch (error) {
      return err({
        type: "StorageError",
        op: "list",
        key: options.prefix ?? "images/",
        message: `R2 list failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return {
    listImages,
  };
}
