export function generateOrderNumber(canteenCode: string): string {
  const code = (canteenCode || "ORD").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "ORD";
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `CN-${code}-${randomNum}`;
}
