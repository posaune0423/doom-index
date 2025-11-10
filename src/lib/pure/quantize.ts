export function quantize01(value: number, buckets = 5): number {
  const safeBuckets = Number.isFinite(buckets) ? Math.max(1, Math.floor(buckets)) : 1;
  const clamped = Math.min(Math.max(value, 0), 1);
  return Math.round(clamped * safeBuckets) / safeBuckets;
}
