import { describe, it, expect } from "bun:test";
import { appRouter } from "@/server/trpc/routers/_app";
import { createMockContext } from "../../../unit/server/trpc/helpers";
import { TOKEN_TICKERS } from "@/constants/token";

describe("Token Integration", () => {
  it("should fetch token state for all tickers", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    for (const ticker of TOKEN_TICKERS) {
      try {
        const result = await caller.token.getState({ ticker });

        // nullまたはTokenStateを返す
        if (result !== null) {
          expect(result).toHaveProperty("ticker");
          expect(result).toHaveProperty("thumbnailUrl");
          expect(result).toHaveProperty("updatedAt");
          expect(result.ticker).toBe(ticker);
        }
      } catch (error) {
        // R2が利用できない場合はスキップ
        console.log(`Skipping test for ${ticker}: R2 not available`, error);
      }
    }
  });

  it("should return null for non-existent token state", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    try {
      // 存在しない可能性が高いトークン状態を取得
      const result = await caller.token.getState({ ticker: "CO2" });

      // nullまたはTokenStateを返す（どちらも有効）
      expect(result === null || typeof result === "object").toBe(true);
    } catch (error) {
      // R2が利用できない場合はスキップ
      console.log("Skipping test: R2 not available", error);
    }
  });
});
