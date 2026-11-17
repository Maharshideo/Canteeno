import { z } from "zod";

export const createOrderSchema = z.object({
  canteenId: z.string().min(1, "canteenId is required"),
  items: z
    .array(
      z.object({
        foodId: z.string().min(1, "foodId is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1").max(10, "Max 10 per item"),
      })
    )
    .min(1, "Order must contain at least 1 item"),
  pickupSlot: z.string().optional().default("asap"),
  note: z.string().max(140, "Note cannot exceed 140 characters").optional().default(""),
  paymentMethod: z.string().optional().default("counter"),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(200).optional().default("Cancelled by student"),
});

export const rejectOrderSchema = z.object({
  reason: z.string().max(200).optional().default("Rejected by canteen staff"),
});

export const updatePrepTimeSchema = z.object({
  minutes: z.number().int().min(1, "Minimum 1 minute").max(120, "Maximum 120 minutes"),
});
