import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // max 30 login/signup attempts per 15 minutes
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // max 500 requests per IP per 15 minutes
  message: {
    success: false,
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
