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
export async function getPlaceholderDataUrl(assetsFetcher?: Fetcher): Promise<string> {
  try {
    let fetcher: Fetcher | undefined = assetsFetcher;

    // Resolve ASSETS binding from Cloudflare context if not provided
    if (!fetcher) {
      try {
        const { env } = await getCloudflareContext({ async: true });
        fetcher = (env as Cloudflare.Env | Record<string, unknown>).ASSETS as Fetcher | undefined;
      } catch (error) {
        logger.warn("ogp.placeholder-assets-resolution-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return "";
      }
    }

    if (!fetcher) {
      logger.warn("ogp.placeholder-assets-not-available");
      return "";
    }

    // Use ASSETS fetcher to get static asset directly (avoids circular fetch)
    const response = await fetcher.fetch("/placeholder-painting.webp");

    if (!response.ok) {
      logger.warn("ogp.placeholder-fetch-failed", { status: response.status });
      return "";
    }

    const buffer = await response.arrayBuffer();
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
export async function getFrameDataUrl(assetsFetcher?: Fetcher): Promise<string | null> {
  try {
    let fetcher: Fetcher | undefined = assetsFetcher;

    // Resolve ASSETS binding from Cloudflare context if not provided
    if (!fetcher) {
      try {
        const { env } = await getCloudflareContext({ async: true });
        fetcher = (env as Cloudflare.Env | Record<string, unknown>).ASSETS as Fetcher | undefined;
      } catch (error) {
        logger.warn("ogp.frame-assets-resolution-failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    }

    if (!fetcher) {
      logger.warn("ogp.frame-assets-not-available");
      return null;
    }

    // Use ASSETS fetcher to get static asset directly (avoids circular fetch)
    const response = await fetcher.fetch("/frame.webp");

    if (!response.ok) {
      logger.warn("ogp.frame-fetch-failed", { status: response.status });
      return null;
    }

    const buffer = await response.arrayBuffer();
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
 * Timeout helper: wraps a promise with a timeout
 * Never throws - always returns fallback result
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: () => Promise<T>): Promise<T> {
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  } catch (error) {
    logger.warn("ogp.timeout", {
      timeoutMs,
      error: error instanceof Error ? error.message : String(error),
    });
    try {
      return await fallback();
    } catch (fallbackError) {
      logger.error("ogp.timeout-fallback-error", {
        error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
      });
      // Return a default value based on the expected type
      // This is a last resort - should not happen if fallback is properly implemented
      return {} as T;
    }
  }
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
  const TIMEOUT_MS = 25000; // 25 seconds timeout (leaving 5s for fallback)

  // Resolve ASSETS fetcher once for reuse
  let assetsFetcher: Fetcher | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    assetsFetcher = (env as Cloudflare.Env | Record<string, unknown>).ASSETS as Fetcher | undefined;
  } catch (error) {
    logger.warn("ogp.assets-resolution-failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    // Parallel execution: fetch artwork and frame simultaneously
    // All operations are wrapped in Promise.allSettled to ensure we always get results
    const [artworkResult, frameResult] = await Promise.allSettled([
      withTimeout(
        getArtworkDataUrl(assetsFetcher).catch(() => ({ dataUrl: "", fallbackUsed: true })),
        TIMEOUT_MS,
        async () => {
          const placeholderDataUrl = await getPlaceholderDataUrl(assetsFetcher);
          return { dataUrl: placeholderDataUrl || "", fallbackUsed: true };
        },
      ),
      getFrameDataUrl(assetsFetcher),
    ]);

    // Extract results safely
    let dataUrl = "";
    let fallbackUsed = true;
    let frameDataUrl: string | null = null;

    if (artworkResult.status === "fulfilled") {
      dataUrl = artworkResult.value.dataUrl || "";
      fallbackUsed = artworkResult.value.fallbackUsed;
    }

    if (frameResult.status === "fulfilled") {
      frameDataUrl = frameResult.value;
    }

    // If we don't have a valid dataUrl, fetch placeholder
    if (!dataUrl) {
      try {
        const placeholderDataUrl = await getPlaceholderDataUrl(assetsFetcher);
        dataUrl = placeholderDataUrl || "";
        fallbackUsed = true;
      } catch (placeholderError) {
        logger.warn("ogp.placeholder-fetch-in-main-error", {
          error: placeholderError instanceof Error ? placeholderError.message : String(placeholderError),
        });
        // dataUrl remains empty, will use text fallback
      }
    }

    // Always render something - renderImageResponse handles empty dataUrl
    return renderImageResponse(dataUrl, frameDataUrl, fallbackUsed, startTime);
  } catch (error) {
    logger.error("ogp.main-error", {
      route: "/opengraph-image",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
      durationMs: Date.now() - startTime,
    });

    // Last resort: try to get placeholder and frame, but don't fail if they don't work
    try {
      const [placeholderResult, frameResult] = await Promise.allSettled([
        getPlaceholderDataUrl(assetsFetcher),
        getFrameDataUrl(assetsFetcher),
      ]);

      const placeholderDataUrl =
        placeholderResult.status === "fulfilled" && placeholderResult.value
          ? placeholderResult.value
          : "";
      const frameDataUrl = frameResult.status === "fulfilled" ? frameResult.value : null;

      return renderImageResponse(placeholderDataUrl, frameDataUrl, true, startTime, "error-fallback");
    } catch (fallbackError) {
      logger.error("ogp.final-fallback-error", {
        route: "/opengraph-image",
        error:
          fallbackError instanceof Error
            ? { message: fallbackError.message, stack: fallbackError.stack }
            : { message: String(fallbackError) },
        durationMs: Date.now() - startTime,
      });

      // Absolute last resort: text-only fallback
      return renderTextFallback();
    }
  }
}
