/**
 * Helper to prevent Prisma MongoDB "Inconsistent column data: Malformed ObjectID"
 * error when querying @id @db.ObjectId fields with human-readable slugs/codes (e.g. "nescafe").
 */
export const isObjectId = (val: unknown): boolean => {
  return typeof val === "string" && /^[a-f\d]{24}$/i.test(val);
};

export const canteenWhere = (idOrCode: string) => {
  const trimmed = String(idOrCode || "").trim();
  return isObjectId(trimmed) ? { id: trimmed } : { code: trimmed };
};
