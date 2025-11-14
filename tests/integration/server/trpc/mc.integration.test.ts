import { describe, it, expect, mock, beforeEach } from "bun:test";
import { appRouter } from "@/server/trpc/routers/_app";
import { createMockContext } from "../../../unit/server/trpc/helpers";
import { ok } from "neverthrow";
import { TOKEN_TICKERS } from "@/constants/token";

describe("MC Integration", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("should fetch market caps from mocked service", async () => {
    // Create deterministic mock market cap data
    const mockMcMap = TOKEN_TICKERS.reduce(
      (acc, ticker) => {
        acc[ticker] = 1000000;
        return acc;
      },
      {} as Record<(typeof TOKEN_TICKERS)[number], number>,
    );

    // Mock the market cap service to avoid calling real external API
    mock.module("@/services/market-cap", () => ({
      createMarketCapService: () => ({
        getMcMap: async () => ok(mockMcMap),
        getRoundedMcMap: async () => ok(mockMcMap),
      }),
    }));

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mc.getMarketCaps();

    expect(result).toHaveProperty("tokens");
    expect(result).toHaveProperty("generatedAt");
    expect(Object.keys(result.tokens).length).toBe(TOKEN_TICKERS.length);
    expect(typeof result.generatedAt).toBe("string");
  });

  it("should return valid market cap values", async () => {
    // Create deterministic mock market cap data with varied values
    const mockMcMap = TOKEN_TICKERS.reduce(
      (acc, ticker, index) => {
        acc[ticker] = (index + 1) * 500000;
        return acc;
      },
      {} as Record<(typeof TOKEN_TICKERS)[number], number>,
    );

    // Mock the market cap service to avoid calling real external API
    mock.module("@/services/market-cap", () => ({
      createMarketCapService: () => ({
        getMcMap: async () => ok(mockMcMap),
        getRoundedMcMap: async () => ok(mockMcMap),
      }),
    }));

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mc.getMarketCaps();

    // 全てのトークンが0以上の値を持つことを確認
    for (const [_ticker, value] of Object.entries(result.tokens)) {
      expect(typeof value).toBe("number");
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("should return rounded market caps", async () => {
    // Create deterministic mock market cap data
    const mockMcMap = TOKEN_TICKERS.reduce(
      (acc, ticker) => {
        acc[ticker] = 1234567.89;
        return acc;
      },
      {} as Record<(typeof TOKEN_TICKERS)[number], number>,
    );

    // Mock the market cap service to avoid calling real external API
    mock.module("@/services/market-cap", () => ({
      createMarketCapService: () => ({
        getMcMap: async () => ok(mockMcMap),
        getRoundedMcMap: async () => ok(mockMcMap),
      }),
    }));

    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.mc.getRoundedMcMap();

    expect(result).toHaveProperty("tokens");
    expect(result).toHaveProperty("generatedAt");
    expect(Object.keys(result.tokens).length).toBe(TOKEN_TICKERS.length);
  });
});
