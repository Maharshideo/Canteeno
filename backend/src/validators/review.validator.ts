import { z } from "zod";

export const createReviewSchema = z.object({
  canteenId: z.string().min(1, "canteenId is required"),
  orderId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(2, "Review must be at least 2 characters").max(500),
});
