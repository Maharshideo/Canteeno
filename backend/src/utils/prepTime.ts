export function calculateEstimatedPrepTime(
  items: { preparationTime: number; quantity: number }[],
  queueLength = 0
): number {
  if (items.length === 0) return 10;
  const slowest = Math.max(...items.map((i) => i.preparationTime || 10));
  const units = items.reduce((sum, i) => sum + i.quantity, 0);
  const extraUnits = Math.min(Math.max(units - 1, 0), 10);
  const queueBonus = Math.min(queueLength * 2, 10);
  return slowest + extraUnits + queueBonus;
}
