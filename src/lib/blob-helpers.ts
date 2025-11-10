/**
 * Blob Storage Helper Functions
 *
 * Provides convenient utilities for common blob operations
 */

import { err, ok, Result } from "neverthrow";
import type { BlobClient } from "@/lib/blob-client";
import type { AppError } from "@/types/app-error";

/**
 * Build blob key path for organized storage
 */
export const blobKeys = {
  globalState: () => "state/global.json",
  tokenState: (ticker: string) => `state/${ticker}.json`,
  revenue: (minuteIso: string) => `revenue/${minuteIso}.json`,
  image: (filename: string) => `images/${filename}`,
} as const;

/**
 * Batch write multiple JSON objects to blob storage
 * Stops on first error and returns it
 */
export async function batchWriteJson(
  blobClient: BlobClient,
  entries: Array<{ key: string; value: unknown }>,
): Promise<Result<void, AppError>> {
  for (const { key, value } of entries) {
    const putResult = await blobClient.put(key, JSON.stringify(value), {
      contentType: "application/json",
    });

    if (putResult.isErr()) return err(putResult.error);
  }

  return ok(undefined);
}

/**
 * Check if a blob exists without downloading its content
 */
export async function blobExists(blobClient: BlobClient, key: string): Promise<Result<boolean, AppError>> {
  const headResult = await blobClient.head(key);
  if (headResult.isErr()) return err(headResult.error);
  return ok(headResult.value !== null);
}

/**
 * Get blob metadata (URL, content type) without downloading content
 */
export async function getBlobMetadata(
  blobClient: BlobClient,
  key: string,
): Promise<Result<{ url: string; contentType?: string } | null, AppError>> {
  return blobClient.head(key);
}

/**
 * List all blobs with a given prefix (folder)
 * Note: This is a placeholder for future implementation when @vercel/blob supports listing
 *
 * @param _blobClient - Blob client instance (unused, reserved for future implementation)
 * @param _prefix - Prefix to filter blobs (unused, reserved for future implementation)
 */
export async function listBlobsByPrefix(
  _blobClient: BlobClient,
  _prefix: string,
): Promise<Result<string[], AppError>> {
  // TODO: Implement when @vercel/blob adds list() support
  return ok([]);
}

/**
 * Retry blob operation with exponential backoff
 */
export async function retryBlobOperation<T>(
  operation: () => Promise<Result<T, AppError>>,
  maxRetries = 3,
  initialDelayMs = 100,
): Promise<Result<T, AppError>> {
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await operation();

    if (result.isOk()) return result;

    lastError = result.error;

    // Don't retry on validation errors or non-retryable errors
    if (lastError.type === "ValidationError") {
      return err(lastError);
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return err(lastError!);
}
