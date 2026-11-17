import { z } from "zod";

export const createCanteenSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(20).optional(),
  tagline: z.string().max(150).optional().default(""),
  description: z.string().max(500).optional().default(""),
  location: z.string().min(2).max(150),
  cuisine: z.array(z.string()).default([]),
  image: z.string().optional().default(""),
  openingTime: z.string().optional().default("08:00"),
  closingTime: z.string().optional().default("22:00"),
  openingHours: z.any().optional(),
  isOpen: z.boolean().default(true),
  acceptingOrders: z.boolean().default(true),
  featured: z.boolean().default(false),
  phone: z.string().optional().default(""),
  prepTime: z.number().int().min(1).max(60).default(15),
  isDemo: z.boolean().default(true),
});

export const updateCanteenSchema = createCanteenSchema.partial();

export const updateCanteenStatusSchema = z.object({
  isOpen: z.boolean().optional(),
  acceptingOrders: z.boolean().optional(),
});
