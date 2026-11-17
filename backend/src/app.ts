import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { apiLimiter } from "./middleware/rateLimiter.middleware.js";

const app = express();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // allow flexible development and embedded content
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logging
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting on all /api routes
app.use("/api", apiLimiter);

// API router
app.use("/api", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Centralized error handler
app.use(errorHandler);

export default app;
