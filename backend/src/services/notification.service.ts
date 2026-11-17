import { prisma } from "../config/database.js";
import { notifyUser } from "./socket.service.js";

interface CreateNotificationParams {
  userId: string;
  orderId?: string;
  title: string;
  message: string;
  kind?: "order" | "offer" | "system";
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        orderId: params.orderId,
        title: params.title,
        message: params.message,
        kind: params.kind || "order",
      },
    });

    // Real-time delivery
    notifyUser(params.userId, "notification:new", {
      id: notification.id,
      userId: notification.userId,
      orderId: notification.orderId,
      title: notification.title,
      body: notification.message,
      message: notification.message,
      kind: notification.kind,
      read: notification.isRead,
      isRead: notification.isRead,
      at: notification.createdAt.toISOString(),
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error("Failed to create and dispatch notification:", err);
    return null;
  }
};
