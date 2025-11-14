import { router, publicProcedure } from "../trpc";
import { createMarketCapService } from "@/services/market-cap";
import { roundMc } from "@/lib/round";
import { TOKEN_TICKERS } from "@/constants/token";
import { TRPCError } from "@trpc/server";

const zeroMap = TOKEN_TICKERS.reduce(
  (acc, ticker) => {
    acc[ticker] = 0;
    return acc;
  },
  {} as Record<(typeof TOKEN_TICKERS)[number], number>,
);

export const mcRouter = router({
  getMarketCaps: publicProcedure.query(async ({ ctx }) => {
    const marketCapService = createMarketCapService({
      fetch,
      log: ctx.logger,
    });

    const result = await marketCapService.getMcMap();

    if (result.isErr()) {
      ctx.logger.error("trpc.mc.getMarketCaps.error", result.error);

      // エラー時はゼロマップを返す（既存の挙動を維持）
      return {
        tokens: zeroMap,
        generatedAt: new Date().toISOString(),
      };
    }

    const rounded = roundMc(result.value);
    return {
      tokens: rounded,
      generatedAt: new Date().toISOString(),
    };
  }),

  getRoundedMcMap: publicProcedure.query(async ({ ctx }) => {
    const marketCapService = createMarketCapService({
      fetch,
      log: ctx.logger,
    });

    const result = await marketCapService.getRoundedMcMap();

    if (result.isErr()) {
      ctx.logger.error("trpc.mc.getRoundedMcMap.error", result.error);

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch market caps",
        cause: result.error,
      });
    }

    return {
      tokens: result.value,
      generatedAt: new Date().toISOString(),
    };
  }),
});
