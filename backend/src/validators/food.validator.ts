import { z } from "zod";

export const createFoodSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(300).optional().default(""),
  price: z.number().min(1, "Price must be greater than 0"),
  categoryId: z.string().optional(),
  category: z.string().optional(),
  isVeg: z.boolean().default(true),
  image: z.string().url().or(z.string().min(1)).optional().default(""),
  preparationTime: z.number().int().min(1).max(120).default(10),
  inStock: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  popular: z.boolean().default(false),
  recommended: z.boolean().default(false),
  canteenId: z.string().optional(), // only required if admin
});

export const updateFoodSchema = createFoodSchema.partial();

export const updateFoodAvailabilitySchema = z.object({
  inStock: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});
