/**
 * Blob Storage Client Abstraction
 *
 * Provides unified interface for blob storage operations.
 * - Production: Uses Vercel Blob SDK
 * - Development/Test: Uses in-memory implementation
 */

import { put as vercelPut, head as vercelHead } from "@vercel/blob";
import { err, ok, Result } from "neverthrow";
import type { AppError } from "@/types/app-error";

export type BlobPutOptions = {
  contentType?: string;
  access?: "public";
  addRandomSuffix?: boolean;
};

export type BlobGetResult = {
  text: () => Promise<string>;
};

export type BlobClient = {
  put: (key: string, data: ArrayBuffer | string, options?: BlobPutOptions) => Promise<Result<string, AppError>>;
  get: (key: string) => Promise<Result<BlobGetResult | null, AppError>>;
  head: (key: string) => Promise<Result<{ url: string; contentType?: string } | null, AppError>>;
};

/**
 * Create Vercel Blob client for production use
 */
export function createVercelBlobClient(token: string): BlobClient {
  return {
    async put(key: string, data: ArrayBuffer | string, options?: BlobPutOptions): Promise<Result<string, AppError>> {
      try {
        const blob = await vercelPut(key, data, {
          access: options?.access ?? "public",
          contentType: options?.contentType,
          addRandomSuffix: options?.addRandomSuffix ?? false,
          token,
        });
        return ok(blob.url);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "put",
          key,
          message: `Vercel Blob put failed: ${message}`,
        });
      }
    },

    async get(key: string): Promise<Result<BlobGetResult | null, AppError>> {
      try {
        const metadata = await vercelHead(key, { token });
        if (!metadata) return ok(null);

        const response = await fetch(metadata.url);
        if (!response.ok) {
          return err({
            type: "StorageError",
            op: "get",
            key,
            message: `Fetch failed with status ${response.status}`,
          });
        }

        return ok({
          async text() {
            return response.text();
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "get",
          key,
          message: `Vercel Blob get failed: ${message}`,
        });
      }
    },

    async head(key: string): Promise<Result<{ url: string; contentType?: string } | null, AppError>> {
      try {
        const metadata = await vercelHead(key, { token });
        if (!metadata) return ok(null);

        return ok({
          url: metadata.url,
          contentType: metadata.contentType,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "get",
          key,
          message: `Vercel Blob head failed: ${message}`,
        });
      }
    },
  };
}

/**
 * In-memory blob client for development and testing
 */
type StoredValue = {
  content: ArrayBuffer | string;
  contentType?: string;
};

const cloneBuffer = (buffer: ArrayBuffer): ArrayBuffer => buffer.slice(0);

export function createMemoryBlobClient(): BlobClient & { _store: Map<string, StoredValue> } {
  const store = new Map<string, StoredValue>();

  return {
    async put(key: string, data: ArrayBuffer | string, options?: BlobPutOptions): Promise<Result<string, AppError>> {
      try {
        const content = data instanceof ArrayBuffer ? cloneBuffer(data) : data;
        store.set(key, { content, contentType: options?.contentType });
        return ok(`https://blob.local/${key}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "put",
          key,
          message: `Memory blob put failed: ${message}`,
        });
      }
    },

    async get(key: string): Promise<Result<BlobGetResult | null, AppError>> {
      try {
        const entry = store.get(key);
        if (!entry) return ok(null);

        const { content } = entry;
        if (typeof content === "string") {
          return ok({
            async text() {
              return content;
            },
          });
        }

        const decoder = new TextDecoder();
        const decoded = decoder.decode(content);
        return ok({
          async text() {
            return decoded;
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "get",
          key,
          message: `Memory blob get failed: ${message}`,
        });
      }
    },

    async head(key: string): Promise<Result<{ url: string; contentType?: string } | null, AppError>> {
      try {
        const entry = store.get(key);
        if (!entry) return ok(null);

        return ok({
          url: `https://blob.local/${key}`,
          contentType: entry.contentType,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return err({
          type: "StorageError",
          op: "get",
          key,
          message: `Memory blob head failed: ${message}`,
        });
      }
    },

    _store: store,
  };
}
