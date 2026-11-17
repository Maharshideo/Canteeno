import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().email("Invalid email address").max(120),
  password: z.string().min(6, "Password must be at least 6 characters").max(64),
  rollNo: z.string().trim().min(3, "Roll number must be at least 3 characters").max(20),
  phone: z.string().trim().regex(/^[+\d\s-]{10,16}$/, "Invalid phone number"),
  hostel: z.string().trim().max(50).optional().default(""),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().email().max(120).optional(),
  phone: z.string().trim().regex(/^[+\d\s-]{10,16}$/).optional(),
  rollNo: z.string().trim().min(3).max(20).optional(),
  hostel: z.string().trim().max(50).optional(),
});
