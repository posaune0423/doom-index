#!/usr/bin/env bun

/**
 * Cleanup Old R2 Objects Script
 *
 * This script removes R2 objects that don't match the new archive structure:
 * - Old structure: images/DOOM_*.webp (directly under images/)
 * - New structure: images/{YYYY}/{MM}/{DD}/DOOM_{YYYYMMDDHHmm}_{paramsHash}_{seed}.webp
 *
 * Usage:
 *   bun scripts/cleanup-old-r2-objects.ts --dry-run  # Preview what will be deleted
 *   bun scripts/cleanup-old-r2-objects.ts            # Actually delete objects
 */

import { resolveR2BucketAsync, listR2Objects } from "@/lib/r2";
import { isValidArchiveFilename } from "@/lib/pure/archive";
import { logger } from "@/utils/logger";

type Args = {
  dryRun: boolean;
  prefix?: string;
};

const parseArgs = (): Args => {
  const args = Bun.argv.slice(2);
  const parsed: Partial<Args> = {
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "-d") {
      parsed.dryRun = true;
    } else if (arg === "--prefix" && i + 1 < args.length) {
      parsed.prefix = args[i + 1];
      i++;
    }
  }

  return parsed as Args;
};

/**
 * Check if a key matches the new archive structure
 * New structure: images/{YYYY}/{MM}/{DD}/DOOM_{YYYYMMDDHHmm}_{paramsHash}_{seed}.webp
 */
function isNewArchiveStructure(key: string): boolean {
  // Must start with images/
  if (!key.startsWith("images/")) {
    return false;
  }

  // Check if it matches the date prefix pattern: images/{YYYY}/{MM}/{DD}/
  const datePrefixPattern = /^images\/\d{4}\/\d{2}\/\d{2}\//;
  if (!datePrefixPattern.test(key)) {
    return false;
  }

  // Extract filename
  const filename = key.split("/").pop() || "";

  // For .webp files, check if filename matches the new pattern
  if (filename.endsWith(".webp")) {
    return isValidArchiveFilename(filename);
  }

  // For .json files, check if corresponding .webp would match
  if (filename.endsWith(".json")) {
    const webpFilename = filename.replace(/\.json$/, ".webp");
    return isValidArchiveFilename(webpFilename);
  }

  return false;
}

/**
 * Collect all objects to delete
 */
async function collectObjectsToDelete(
  bucket: R2Bucket,
  prefix: string,
): Promise<{ toDelete: string[]; stats: { webp: number; json: number; other: number } }> {
  const toDelete: string[] = [];
  const stats = { webp: 0, json: 0, other: 0 };
  let cursor: string | undefined;

  logger.info("cleanup.scanning", { prefix });

  // First pass: collect all objects
  const allObjects: R2Object[] = [];
  do {
    const listResult = await listR2Objects(bucket, {
      prefix,
      cursor,
      limit: 1000,
    });

    if (listResult.isErr()) {
      logger.error("cleanup.list.failed", {
        error: listResult.error.message,
        prefix,
      });
      throw new Error(`Failed to list objects: ${listResult.error.message}`);
    }

    allObjects.push(...listResult.value.objects);
    cursor = listResult.value.truncated ? listResult.value.cursor : undefined;

    logger.debug("cleanup.scanning.progress", {
      collected: allObjects.length,
      hasMore: Boolean(cursor),
    });
  } while (cursor);

  logger.info("cleanup.scanning.complete", {
    totalObjects: allObjects.length,
  });

  // Build a set of all .webp files for quick lookup
  const webpFiles = new Set<string>();
  for (const obj of allObjects) {
    if (obj.key.endsWith(".webp")) {
      webpFiles.add(obj.key);
    }
  }

  // Second pass: identify objects to delete
  for (const obj of allObjects) {
    const key = obj.key;

    // Skip if it matches the new structure
    if (isNewArchiveStructure(key)) {
      continue;
    }

    // Check if it's a .webp file
    if (key.endsWith(".webp")) {
      stats.webp++;

      // Check if corresponding .json exists
      const metadataKey = key.replace(/\.webp$/, ".json");
      const hasMetadata = allObjects.some(o => o.key === metadataKey);

      if (!hasMetadata) {
        // No metadata file - definitely old structure
        toDelete.push(key);
        logger.debug("cleanup.marked.webp.no-metadata", { key });
      } else {
        // Has metadata but wrong structure - mark both for deletion
        toDelete.push(key);
        toDelete.push(metadataKey);
        logger.debug("cleanup.marked.webp.wrong-structure", { key, metadataKey });
      }
    }
    // Check if it's a .json file
    else if (key.endsWith(".json")) {
      stats.json++;

      // Check if corresponding .webp exists
      const webpKey = key.replace(/\.json$/, ".webp");
      const hasWebp = webpFiles.has(webpKey);

      if (!hasWebp) {
        // Orphaned metadata file
        toDelete.push(key);
        logger.debug("cleanup.marked.json.orphaned", { key });
      } else if (!isNewArchiveStructure(webpKey)) {
        // Corresponding webp is old structure - mark both for deletion
        if (!toDelete.includes(webpKey)) {
          toDelete.push(webpKey);
        }
        if (!toDelete.includes(key)) {
          toDelete.push(key);
        }
        logger.debug("cleanup.marked.json.wrong-structure", { key, webpKey });
      }
    }
    // Other files (shouldn't exist in images/, but handle anyway)
    else {
      stats.other++;
      // Only delete if it's not in a date-prefixed directory
      if (!key.match(/^images\/\d{4}\/\d{2}\/\d{2}\//)) {
        toDelete.push(key);
        logger.debug("cleanup.marked.other", { key });
      }
    }
  }

  // Remove duplicates
  const uniqueToDelete = Array.from(new Set(toDelete));

  return {
    toDelete: uniqueToDelete,
    stats,
  };
}

async function main() {
  const args = parseArgs();
  const prefix = args.prefix ?? "images/";

  logger.info("cleanup.starting", {
    dryRun: args.dryRun,
    prefix,
  });

  // Resolve R2 bucket
  const bucketResult = await resolveR2BucketAsync();
  if (bucketResult.isErr()) {
    logger.error("cleanup.bucket.resolve.failed", {
      error: bucketResult.error.message,
    });
    console.error("❌ Failed to resolve R2 bucket:", bucketResult.error.message);
    process.exit(1);
  }

  const bucket = bucketResult.value;

  try {
    // Collect objects to delete
    const { toDelete, stats } = await collectObjectsToDelete(bucket, prefix);

    logger.info("cleanup.analysis.complete", {
      totalToDelete: toDelete.length,
      stats,
    });

    if (toDelete.length === 0) {
      console.log("✅ No old objects found. All objects match the new archive structure.");
      return;
    }

    // Group by type for reporting
    const webpToDelete = toDelete.filter(k => k.endsWith(".webp"));
    const jsonToDelete = toDelete.filter(k => k.endsWith(".json"));
    const otherToDelete = toDelete.filter(k => !k.endsWith(".webp") && !k.endsWith(".json"));

    console.log("\n📊 Objects to delete:");
    console.log(`  - ${webpToDelete.length} .webp files`);
    console.log(`  - ${jsonToDelete.length} .json files`);
    console.log(`  - ${otherToDelete.length} other files`);
    console.log(`  Total: ${toDelete.length} objects\n`);

    if (args.dryRun) {
      console.log("🔍 DRY RUN MODE - No objects will be deleted\n");
      console.log("Sample objects to delete (first 10):");
      toDelete.slice(0, 10).forEach(key => {
        console.log(`  - ${key}`);
      });
      if (toDelete.length > 10) {
        console.log(`  ... and ${toDelete.length - 10} more`);
      }
      console.log("\n💡 Run without --dry-run to actually delete these objects.");
      return;
    }

    // Confirm deletion
    console.log("⚠️  WARNING: This will permanently delete the objects listed above.");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete objects in batches (R2 delete supports up to 1000 keys per call)
    const batchSize = 1000;
    let deletedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);

      try {
        await bucket.delete(batch);
        deletedCount += batch.length;
        logger.info("cleanup.delete.batch", {
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length,
          totalDeleted: deletedCount,
        });
        console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} objects (${deletedCount}/${toDelete.length})`);
      } catch (error) {
        errorCount += batch.length;
        logger.error("cleanup.delete.batch.failed", {
          batchIndex: Math.floor(i / batchSize) + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`❌ Failed to delete batch ${Math.floor(i / batchSize) + 1}:`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log("\n📊 Cleanup Summary:");
    console.log(`  ✅ Successfully deleted: ${deletedCount} objects`);
    if (errorCount > 0) {
      console.log(`  ❌ Failed to delete: ${errorCount} objects`);
    }
    console.log(`  📦 Total processed: ${toDelete.length} objects\n`);

    if (deletedCount === toDelete.length) {
      console.log("✅ Cleanup completed successfully!");
    } else {
      console.log("⚠️  Cleanup completed with some errors. Please review the logs.");
      process.exit(1);
    }
  } catch (error) {
    logger.error("cleanup.failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    console.error("❌ Cleanup failed:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(error => {
  logger.error("cleanup.unhandled", {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
