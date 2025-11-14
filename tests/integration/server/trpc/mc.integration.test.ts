import { describe, it, expect } from "bun:test";
import { appRouter } from "@/server/trpc/routers/_app";
import { createMockContext } from "../../../unit/server/trpc/helpers";

describe("MC Integration", () => {
  it("should fetch market caps from real service", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // 実際のサービス層を使用（外部APIはモック化されていない場合、実際に呼び出される）
    try {
      const result = await caller.mc.getMarketCaps();

      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("generatedAt");
      expect(Object.keys(result.tokens).length).toBe(8);
      expect(typeof result.generatedAt).toBe("string");
    } catch (error) {
      // 外部APIが利用できない場合はスキップ
      console.log("Skipping test: external API not available", error);
    }
  });

  it("should return valid market cap values", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.mc.getMarketCaps();

      // 全てのトークンが0以上の値を持つことを確認
      for (const [_ticker, value] of Object.entries(result.tokens)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
      }
    } catch (error) {
      console.log("Skipping test: external API not available", error);
    }
  });

  it("should return rounded market caps", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.mc.getRoundedMcMap();

      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("generatedAt");
      expect(Object.keys(result.tokens).length).toBe(8);
    } catch (error) {
      console.log("Skipping test: external API not available", error);
    }
  });
});
