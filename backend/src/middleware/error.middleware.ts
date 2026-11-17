import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("Unhandled Error:", err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal server error";

  sendError(
    res,
    message,
    statusCode,
    process.env.NODE_ENV === "development" ? { stack: err.stack } : undefined
  );
};
