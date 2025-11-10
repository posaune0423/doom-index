import { ok } from "neverthrow";
import type { RevenueEngine, TradeSnapshot, RevenueReport } from "@/types/domain";
import { TOKEN_TICKERS, type TokenTicker } from "@/constants/token";

const FEE_RATE = 0.0005;
const COST_PER_IMAGE = 0.002;
const MINUTES_PER_DAY = 1440;
const DAYS_PER_MONTH = 30;
const OUTPUT_PRECISION = 1e-6;

const sanitize = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return value > 0 ? value : 0;
};

const round = (value: number): number => Math.round(value / OUTPUT_PRECISION) * OUTPUT_PRECISION;

export const createRevenueEngine = (): RevenueEngine => ({
  calculateMinuteRevenue(snapshots: TradeSnapshot[], generationRate: number) {
    const perTokenFee = TOKEN_TICKERS.reduce(
      (acc, ticker) => {
        const snapshot = snapshots.find(item => item.ticker === ticker);
        if (!snapshot) {
          acc[ticker] = 0;
          return acc;
        }
        const trades = sanitize(snapshot.tradesPerMinute);
        const average = sanitize(snapshot.averageTradeUsd);
        const fee = trades * average * FEE_RATE;
        acc[ticker] = round(fee);
        return acc;
      },
      {} as Record<TokenTicker, number>,
    );

    const totalFee = round(Object.values(perTokenFee).reduce((sum, value) => sum + value, 0));
    const monthlyCost = round(COST_PER_IMAGE * MINUTES_PER_DAY * DAYS_PER_MONTH * Math.max(generationRate, 0));
    const netProfit = round(totalFee - monthlyCost);

    const report: RevenueReport = {
      perTokenFee,
      totalFee,
      monthlyCost,
      netProfit,
    };

    return ok(report);
  },
});
