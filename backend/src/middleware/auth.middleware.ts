import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest, AuthUser } from "../types/index.js";
import { sendError } from "../utils/response.js";

interface JwtPayload {
  id: string;
  email: string;
  role: Role;
  canteenId?: string | null;
}

export const authenticateJWT = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      sendError(res, "Authentication required. Please provide a Bearer token.", 401);
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        canteenId: true,
        hostel: true,
        status: true,
      },
    });

    if (!user) {
      sendError(res, "User not found or session expired.", 401);
      return;
    }

    if (user.status === "suspended") {
      sendError(res, "This account is suspended. Contact administration.", 403);
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      canteenId: user.canteenId,
      hostel: user.hostel,
    };

    next();
  } catch (err) {
    sendError(res, "Invalid or expired token.", 401);
  }
};

export const requireRole = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Unauthorized. Authentication required.", 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(
        res,
        `Forbidden. Access restricted to role: ${roles.join(", ")}`,
        403
      );
      return;
    }

    next();
  };
};

export const requireCanteenStaff = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    sendError(res, "Unauthorized. Authentication required.", 401);
    return;
  }

  // Admins can manage any canteen
  if (req.user.role === Role.ADMIN) {
    next();
    return;
  }

  if (req.user.role !== Role.CANTEEN_STAFF) {
    sendError(res, "Forbidden. Staff access required.", 403);
    return;
  }

  if (!req.user.canteenId) {
    sendError(res, "Staff user has no canteen assigned.", 403);
    return;
  }

  next();
};
