import { getBaseUrl } from "@/utils/url";
import type { ImageLoaderProps } from "next/image";
import { logger } from "@/utils/logger";

export default function cloudflareLoader({ src, width, quality }: ImageLoaderProps) {
  const params = [`width=${width}`];
  if (quality) {
    params.push(`quality=${quality}`);
  }

  if (typeof window !== "undefined") {
    logger.debug("image.loader.process", {
      src,
      width,
      quality,
      nodeEnv: process.env.NODE_ENV,
    });
  }

  const origin = getBaseUrl();
  const isLocalOrigin = /localhost|127\.0\.0\.1/.test(origin);

  const returnOriginal = (u: string) => `${u}?${params.join("&")}`;

  if (src.startsWith("/api/r2/")) {
    if (isLocalOrigin) {
      const result = returnOriginal(src);
      if (typeof window !== "undefined") {
        logger.debug("image.loader.local.origin", {
          src,
          origin,
          result,
        });
      }
      return result;
    }

    const absoluteUrl = `${origin}${src}`;
    const result = `/cdn-cgi/image/${params.join(",")}/${absoluteUrl}`;
    if (typeof window !== "undefined") {
      logger.debug("image.loader.transform", {
        src,
        origin,
        absoluteUrl,
        result,
      });
    }
    return result;
  }

  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(src)) {
      const result = returnOriginal(src);
      if (typeof window !== "undefined") {
        logger.debug("image.loader.absolute.local", { src, result });
      }
      return result;
    }

    const result = `/cdn-cgi/image/${params.join(",")}/${src}`;
    if (typeof window !== "undefined") {
      logger.debug("image.loader.absolute.transform", {
        src,
        result,
      });
    }
    return result;
  }

  if (isLocalOrigin) {
    const result = returnOriginal(src);
    if (typeof window !== "undefined") {
      logger.debug("image.loader.relative.local", {
        src,
        origin,
        result,
      });
    }
    return result;
  }

  const absoluteUrl = src.startsWith("/") ? `${origin}${src}` : `${origin}/${src}`;
  const result = `/cdn-cgi/image/${params.join(",")}/${absoluteUrl}`;
  if (typeof window !== "undefined") {
    logger.debug("image.loader.relative.transform", {
      src,
      origin,
      absoluteUrl,
      result,
    });
  }
  return result;
}
