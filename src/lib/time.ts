/**
 * Returns an ISO-like minute bucket string that is stable within the same minute.
 * Example: "2025-11-09T12:34"
 */
export function getMinuteBucket(date: Date = new Date()): string {
  const copy = new Date(date.getTime());
  copy.setSeconds(0, 0);
  // Keep it simple and deterministic; ISO 8601 up to minutes
  return copy.toISOString().slice(0, 16);
}
