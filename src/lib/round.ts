export function roundMc4<T extends Record<string, number>>(input: T): T {
  const out: Record<string, number> = {};
  for (const k of Object.keys(input)) {
    const v = input[k] ?? 0;
    out[k] = Math.round(v * 10_000) / 10_000;
  }
  return out as T;
}
