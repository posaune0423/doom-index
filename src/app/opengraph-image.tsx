/**
 * Dynamic OGP Image Generator
 *
 * Generates Open Graph Protocol images for social media sharing.
 * - Fetches latest artwork from R2 storage
 * - Converts 1:1 square image to 1200×630 letterbox format
 * - Black background with centered image
 * - Falls back to placeholder on error
 * - ISR: Regenerates every 60 seconds
 */

import { ImageResponse } from "next/og";
import { getJsonR2, getImageR2, resolveR2BucketAsync } from "@/lib/r2";
import { logger } from "@/utils/logger";
import { arrayBufferToDataUrl } from "@/utils/image";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { GlobalState } from "@/types/domain";

// Route Segment Config for ISR
export const dynamic = "force-dynamic"; // Skip static generation at build time
export const revalidate = 60; // Regenerate every 60 seconds
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "DOOM INDEX - Current world state visualization";

/**
 * Fetch placeholder image and convert to data URL
 * Exported for testing
 * Never throws - always returns a valid data URL or empty string
 *
 * @param assetsFetcher - Optional ASSETS fetcher for testing (resolves from context if not provided)
 */
export async function getPlaceholderDataUrl(assetsFetcher?: Fetcher, timeoutMs = 3000): Promise<string> {
  try {
    // If assetsFetcher is not provided, return empty string immediately
    // The caller should resolve ASSETS fetcher before calling this function
    if (!assetsFetcher) {
      logger.warn("ogp.placeholder-assets-not-provided");
      return "";
    }

    const fetcher = assetsFetcher;

    // Use ASSETS fetcher to get static asset directly (avoids circular fetch)
    // Apply timeout to prevent hanging
    const response = await withTimeout(
      fetcher.fetch("/placeholder-painting.webp"),
      timeoutMs,
      () => new Response(null, { status: 408 }),
      "getPlaceholderDataUrl.fetch",
    );

    if (!response.ok) {
      logger.warn("ogp.placeholder-fetch-failed", { status: response.status });
      return "";
    }

    const buffer = await withTimeout(
      response.arrayBuffer(),
      timeoutMs,
      () => new ArrayBuffer(0),
      "getPlaceholderDataUrl.arrayBuffer",
    );

    if (buffer.byteLength === 0) {
      return "";
    }

    return arrayBufferToDataUrl(buffer, "image/webp");
  } catch (error) {
    logger.warn("ogp.placeholder-error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return "";
  }
}

/**
 * Fetch frame image and convert to data URL
 * Exported for testing
 * Never throws - always returns a valid data URL or null
 *
 * @param assetsFetcher - Optional ASSETS fetcher for testing (resolves from context if not provided)
 */
export async function getFrameDataUrl(assetsFetcher?: Fetcher, timeoutMs = 3000): Promise<string | null> {
  try {
    // If assetsFetcher is not provided, return null immediately
    // The caller should resolve ASSETS fetcher before calling this function
    if (!assetsFetcher) {
      logger.warn("ogp.frame-assets-not-provided");
      return null;
    }

    const fetcher = assetsFetcher;

    // Use ASSETS fetcher to get static asset directly (avoids circular fetch)
    // Apply timeout to prevent hanging
    const response = await withTimeout(
      fetcher.fetch("/frame.webp"),
      timeoutMs,
      () => new Response(null, { status: 408 }),
      "getFrameDataUrl.fetch",
    );

    if (!response.ok) {
      logger.warn("ogp.frame-fetch-failed", { status: response.status });
      return null;
    }

    const buffer = await withTimeout(
      response.arrayBuffer(),
      timeoutMs,
      () => new ArrayBuffer(0),
      "getFrameDataUrl.arrayBuffer",
    );

    if (buffer.byteLength === 0) {
      return null;
    }

    return arrayBufferToDataUrl(buffer, "image/webp");
  } catch (error) {
    logger.warn("ogp.frame-error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Fetch latest artwork from R2 and convert to data URL
 * Exported for testing
 *
 * @param baseUrl - Optional base URL for testing (uses env-based URL if not provided)
 */
const R2_ROUTE_PREFIX = "/api/r2/";

/**
 * Timeout helper: wraps a promise with a timeout
 * Returns fallback value if timeout is reached
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: () => T,
  operationName: string,
): Promise<T> {
  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`)), timeoutMs);
    });

    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    logger.warn("ogp.timeout", {
      operation: operationName,
      timeoutMs,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback();
  }
}

const decodeR2Key = (value: string): string | null => {
  if (!value) return null;

  let path = value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      path = parsed.pathname;
    } catch {
      return null;
    }
  }

  if (!path.startsWith(R2_ROUTE_PREFIX)) return null;

  const encoded = path.slice(R2_ROUTE_PREFIX.length);
  if (!encoded) return null;

  return encoded
    .split("/")
    .map(segment => decodeURIComponent(segment))
    .join("/");
};

export async function getArtworkDataUrl(
  assetsFetcher?: Fetcher,
  bucketOverride?: R2Bucket,
): Promise<{ dataUrl: string; fallbackUsed: boolean }> {
  const fallback = async () => {
    try {
      const placeholderDataUrl = await getPlaceholderDataUrl(assetsFetcher);
      return { dataUrl: placeholderDataUrl || "", fallbackUsed: true };
    } catch (error) {
      logger.warn("ogp.artwork-fallback-error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { dataUrl: "", fallbackUsed: true };
    }
  };

  let bucket: R2Bucket;
  if (bucketOverride) {
    bucket = bucketOverride;
  } else {
    const bucketResult = await resolveR2BucketAsync();
    if (bucketResult.isErr()) {
      logger.warn("ogp.bucket-resolution-failed", {
        error: bucketResult.error.message,
      });
      return fallback();
    }
    bucket = bucketResult.value;
  }

  const stateResult = await getJsonR2<GlobalState>(bucket, "state/global.json");

  if (stateResult.isErr()) {
    logger.warn("ogp.state-fetch-failed", {
      error: stateResult.error.message,
    });
    return fallback();
  }

  const state = stateResult.value;
  if (!state || !state.imageUrl) {
    logger.warn("ogp.state-no-image-url", { state });
    return fallback();
  }

  const imageKey = decodeR2Key(state.imageUrl);
  if (!imageKey) {
    logger.warn("ogp.state-invalid-image-url", { imageUrl: state.imageUrl });
    return fallback();
  }

  const imageResult = await getImageR2(bucket, imageKey);
  if (imageResult.isErr() || !imageResult.value) {
    logger.warn("ogp.image-fetch-failed", {
      key: imageKey,
      error: imageResult.isErr() ? imageResult.error.message : "Image not found",
    });
    return fallback();
  }

  const dataUrl = arrayBufferToDataUrl(imageResult.value, "image/webp");
  return { dataUrl, fallbackUsed: false };
}


/**
 * Render ImageResponse with artwork and optional frame
 * Never throws - always returns a valid ImageResponse
 */
function renderImageResponse(
  dataUrl: string,
  frameDataUrl: string | null,
  fallbackUsed: boolean,
  startTime: number,
  fallbackLevel?: string,
): ImageResponse {
  try {
    logger.info("ogp.generated", {
      route: "/opengraph-image",
      fallbackUsed,
      hasFrame: frameDataUrl !== null,
      durationMs: Date.now() - startTime,
      ...(fallbackLevel && { fallbackLevel }),
    });

    // Ensure dataUrl is valid - if empty, use text fallback
    if (!dataUrl) {
      return renderTextFallback();
    }

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Artwork image (centered, behind frame) */}
          <img
            src={dataUrl}
            style={{
              position: "absolute",
              height: "100%",
              width: "auto",
              objectFit: "contain",
            }}
            alt={alt}
          />
          {/* Frame overlay (on top) - only if available */}
          {frameDataUrl && (
            <img
              src={frameDataUrl}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              alt="Frame"
            />
          )}
        </div>
      ),
      {
        ...size,
        headers: {
          "Cache-Control": fallbackUsed ? "public, max-age=300" : "public, max-age=60, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    logger.error("ogp.render-error", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
    });
    return renderTextFallback();
  }
}

/**
 * Render text-only fallback ImageResponse
 * This is the absolute last resort - should always succeed
 */
function renderTextFallback(): ImageResponse {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 40,
            fontWeight: "bold",
          }}
        >
          DOOM INDEX
        </div>
      ),
      {
        ...size,
        headers: { "Cache-Control": "public, max-age=60" },
      },
    );
  } catch (error) {
    // If even this fails, something is seriously wrong
    // Return a minimal response
    logger.error("ogp.text-fallback-error", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
    });
    // This should never happen, but if it does, we need to return something
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: "#000000" }} />,
      { ...size },
    );
  }
}

/**
 * Generate OGP image using ImageResponse
 */

export default async function Image(): Promise<ImageResponse> {
  const startTime = Date.now();
  const MAX_TOTAL_TIME_MS = 20000; // 20 seconds total timeout
  const CONTEXT_TIMEOUT_MS = 2000; // 2 seconds for context resolution
  const ARTWORK_TIMEOUT_MS = 10000; // 10 seconds for artwork fetch
  const FRAME_TIMEOUT_MS = 3000; // 3 seconds for frame fetch
  const PLACEHOLDER_TIMEOUT_MS = 3000; // 3 seconds for placeholder fetch

  logger.info("ogp.start", { route: "/opengraph-image" });

  // Resolve Cloudflare context once and extract all needed bindings
  // Apply timeout to prevent hanging
  let assetsFetcher: Fetcher | undefined;
  let r2Bucket: R2Bucket | undefined;
  try {
    const contextPromise = getCloudflareContext({ async: true });
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Context resolution timeout")), CONTEXT_TIMEOUT_MS);
    });

    const contextResult = await Promise.race([contextPromise, timeoutPromise]);
    const { env } = contextResult;
    const cloudflareEnv = env as Cloudflare.Env | Record<string, unknown>;
    assetsFetcher = cloudflareEnv.ASSETS as Fetcher | undefined;
    r2Bucket = cloudflareEnv.R2_BUCKET as R2Bucket | undefined;
    logger.info("ogp.context-resolved", {
      hasAssets: !!assetsFetcher,
      hasR2Bucket: !!r2Bucket,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.warn("ogp.context-resolution-failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    });
    // Continue with undefined values - fallbacks will handle it
  }

  // Check if we're running out of time
  const elapsedMs = Date.now() - startTime;
  if (elapsedMs > MAX_TOTAL_TIME_MS - 5000) {
    // Less than 5 seconds remaining, skip to fallback immediately
    logger.warn("ogp.time-remaining-low", { elapsedMs, remainingMs: MAX_TOTAL_TIME_MS - elapsedMs });
    return renderTextFallback();
  }

  // Fetch artwork and frame in parallel, with proper error handling and timeouts
  // Pass both assetsFetcher and r2Bucket to avoid nested getCloudflareContext calls
  const remainingTimeMs = MAX_TOTAL_TIME_MS - elapsedMs;
  const artworkTimeout = Math.min(ARTWORK_TIMEOUT_MS, remainingTimeMs - 2000); // Leave 2s buffer

  const [artworkResult, frameResult] = await Promise.allSettled([
    withTimeout(
      getArtworkDataUrl(assetsFetcher, r2Bucket).catch(() => ({ dataUrl: "", fallbackUsed: true })),
      artworkTimeout,
      () => ({ dataUrl: "", fallbackUsed: true }),
      "getArtworkDataUrl",
    ),
    withTimeout(
      getFrameDataUrl(assetsFetcher, FRAME_TIMEOUT_MS).catch(() => null),
      FRAME_TIMEOUT_MS,
      () => null,
      "getFrameDataUrl",
    ),
  ]);

  logger.info("ogp.fetch-completed", {
    artworkStatus: artworkResult.status,
    frameStatus: frameResult.status,
    durationMs: Date.now() - startTime,
  });

  // Extract results safely
  let dataUrl = "";
  let fallbackUsed = true;
  let frameDataUrl: string | null = null;

  if (artworkResult.status === "fulfilled") {
    dataUrl = artworkResult.value.dataUrl || "";
    fallbackUsed = artworkResult.value.fallbackUsed;
    logger.info("ogp.artwork-extracted", { hasDataUrl: !!dataUrl, fallbackUsed });
  } else if (artworkResult.status === "rejected") {
    logger.warn("ogp.artwork-fetch-failed", {
      error: artworkResult.reason instanceof Error ? artworkResult.reason.message : String(artworkResult.reason),
    });
  }

  if (frameResult.status === "fulfilled") {
    frameDataUrl = frameResult.value;
    logger.info("ogp.frame-extracted", { hasFrame: frameDataUrl !== null });
  }

  // Check remaining time before fetching placeholder
  const elapsedAfterFetch = Date.now() - startTime;
  if (elapsedAfterFetch < MAX_TOTAL_TIME_MS - 2000) {
    // If we don't have a valid dataUrl, try to fetch placeholder
    if (!dataUrl) {
      logger.info("ogp.fetching-placeholder");
      try {
        const placeholderDataUrl = await withTimeout(
          getPlaceholderDataUrl(assetsFetcher, PLACEHOLDER_TIMEOUT_MS),
          PLACEHOLDER_TIMEOUT_MS,
          () => "",
          "getPlaceholderDataUrl",
        );

        if (placeholderDataUrl) {
          dataUrl = placeholderDataUrl;
          fallbackUsed = true;
          logger.info("ogp.placeholder-fetched", { hasDataUrl: !!dataUrl });
        }
      } catch (placeholderError) {
        logger.warn("ogp.placeholder-fetch-in-main-error", {
          error: placeholderError instanceof Error ? placeholderError.message : String(placeholderError),
        });
      }
    }
  } else {
    logger.warn("ogp.skip-placeholder-timeout", {
      elapsedMs: elapsedAfterFetch,
      remainingMs: MAX_TOTAL_TIME_MS - elapsedAfterFetch,
    });
  }

  // Always render something - renderImageResponse handles empty dataUrl
  logger.info("ogp.rendering", {
    hasDataUrl: !!dataUrl,
    hasFrame: frameDataUrl !== null,
    durationMs: Date.now() - startTime,
  });
  const response = renderImageResponse(dataUrl, frameDataUrl, fallbackUsed, startTime);
  logger.info("ogp.completed", { durationMs: Date.now() - startTime });
  return response;
}
