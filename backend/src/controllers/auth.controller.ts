import { Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { createNotification } from "../services/notification.service.js";

const generateToken = (user: { id: string; email: string; role: Role; canteenId?: string | null }) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      canteenId: user.canteenId,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );
};

export const register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, password, rollNo, phone, hostel } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      sendError(res, "An account with this email already exists.", 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: Role.STUDENT,
        rollNo,
        phone,
        hostel: hostel || "",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        phone: true,
        hostel: true,
        status: true,
        favouriteFoods: true,
        favouriteCanteens: true,
        createdAt: true,
      },
    });

    const token = generateToken(user);

    // Create welcome notification
    await createNotification({
      userId: user.id,
      title: "Welcome to Canteeno",
      message: "Order ahead, skip the queue, and pick up when your food is ready.",
      kind: "system",
    });

    sendSuccess(
      res,
      {
        user,
        token,
      },
      "Account created successfully",
      201
    );
  } catch (err: any) {
    sendError(res, err.message || "Failed to register account", 500);
  }
};

export const login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    if (user.status === "suspended") {
      sendError(res, "This account is suspended. Please contact campus administration.", 403);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, "Invalid email or password.", 401);
      return;
    }

    const token = generateToken(user);

    const userDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rollNo: user.rollNo,
      phone: user.phone,
      hostel: user.hostel,
      status: user.status,
      canteenId: user.canteenId,
      favouriteFoods: user.favouriteFoods,
      favouriteCanteens: user.favouriteCanteens,
      createdAt: user.createdAt,
    };

    sendSuccess(res, { user: userDto, token }, "Logged in successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to log in", 500);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        phone: true,
        hostel: true,
        status: true,
        canteenId: true,
        favouriteFoods: true,
        favouriteCanteens: true,
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    sendSuccess(res, user);
  } catch (err: any) {
    sendError(res, err.message || "Failed to get user profile", 500);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const { name, phone, rollNo, hostel, email } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(rollNo ? { rollNo } : {}),
        ...(hostel !== undefined ? { hostel } : {}),
        ...(email ? { email: email.toLowerCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        phone: true,
        hostel: true,
        status: true,
        canteenId: true,
        favouriteFoods: true,
        favouriteCanteens: true,
      },
    });

    sendSuccess(res, updated, "Profile updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update profile", 500);
  }
};

export const toggleFavouriteFood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const foodId = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const exists = user.favouriteFoods.includes(foodId);
    const updatedFoods = exists
      ? user.favouriteFoods.filter((f) => f !== foodId)
      : [...user.favouriteFoods, foodId];

    await prisma.user.update({
      where: { id: user.id },
      data: { favouriteFoods: updatedFoods },
    });

    sendSuccess(res, { added: !exists, favouriteFoods: updatedFoods });
  } catch (err: any) {
    sendError(res, err.message || "Failed to toggle favourite food", 500);
  }
};

export const toggleFavouriteCanteen = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const canteenId = String(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }

    const exists = user.favouriteCanteens.includes(canteenId);
    const updatedCanteens = exists
      ? user.favouriteCanteens.filter((c) => c !== canteenId)
      : [...user.favouriteCanteens, canteenId];

    await prisma.user.update({
      where: { id: user.id },
      data: { favouriteCanteens: updatedCanteens },
    });

    sendSuccess(res, { added: !exists, favouriteCanteens: updatedCanteens });
  } catch (err: any) {
    sendError(res, err.message || "Failed to toggle favourite canteen", 500);
  }
};
