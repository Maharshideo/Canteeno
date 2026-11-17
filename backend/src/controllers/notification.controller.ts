import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    const formatted = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      orderId: n.orderId || undefined,
      title: n.title,
      body: n.message,
      message: n.message,
      at: n.createdAt.toISOString(),
      createdAt: n.createdAt.toISOString(),
      read: n.isRead,
      isRead: n.isRead,
      kind: n.kind,
    }));

    sendSuccess(res, formatted);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch notifications", 500);
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const id = String(req.params.id);

    await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });

    sendSuccess(res, { ok: true });
  } catch (err: any) {
    sendError(res, err.message || "Failed to update notification", 500);
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    sendSuccess(res, { ok: true });
  } catch (err: any) {
    sendError(res, err.message || "Failed to update notifications", 500);
  }
};
