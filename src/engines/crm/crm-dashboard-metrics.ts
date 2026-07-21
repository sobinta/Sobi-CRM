export function calculatePercentChange(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function calculateConversionRate(
  converted: number,
  total: number,
): number {
  if (total <= 0) return 0;
  return Math.round((converted / total) * 100);
}
