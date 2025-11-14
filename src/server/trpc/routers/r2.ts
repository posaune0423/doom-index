import { router, publicProcedure } from "../trpc";
import { resolveR2Bucket, getJsonR2 } from "@/lib/r2";
import { r2GetObjectSchema } from "../schemas";
import { TRPCError } from "@trpc/server";

const joinKey = (segments: string[]): string =>
  segments
    .map(segment => segment.replace(/^\/*|\/*$/g, ""))
    .filter(Boolean)
    .join("/");

export const r2Router = router({
  getJson: publicProcedure.input(r2GetObjectSchema).query(async ({ input, ctx }) => {
    const objectKey = joinKey(input.key);

    if (!objectKey) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid R2 object key",
      });
    }

    const bucketResult = resolveR2Bucket();

    if (bucketResult.isErr()) {
      ctx.logger.error("trpc.r2.getJson.resolve-bucket.error", {
        objectKey,
        error: bucketResult.error,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: bucketResult.error.message,
        cause: bucketResult.error,
      });
    }

    const bucket = bucketResult.value;
    const result = await getJsonR2<unknown>(bucket, objectKey);

    if (result.isErr()) {
      ctx.logger.error("trpc.r2.getJson.error", {
        objectKey,
        error: result.error,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.error.message,
        cause: result.error,
      });
    }

    return result.value;
  }),
});
