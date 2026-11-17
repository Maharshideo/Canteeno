import { Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { createOrder, formatOrderResponse, updateOrderStatus } from "../services/order.service.js";

export const placeOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Please log in to place your order.", 401);
      return;
    }

    const { canteenId, items, pickupSlot, note, paymentMethod } = req.body;

    const order = await createOrder({
      studentId: req.user.id,
      canteenId,
      items,
      pickupSlot,
      note,
      paymentMethod,
    });

    sendSuccess(res, order, "Order placed successfully", 201);
  } catch (err: any) {
    sendError(res, err.message || "Failed to place order", 400);
  }
};

export const getMyOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const orders = await prisma.order.findMany({
      where: { studentId: req.user.id },
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true, image: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map(formatOrderResponse);
    sendSuccess(res, formatted);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch orders", 500);
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const id = String(req.params.id);

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true, image: true, phone: true },
        },
      },
    });

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }

    // Security check: only student who placed it, canteen staff assigned, or admin can view
    const isOwner = order.studentId === req.user.id;
    const isStaff = req.user.role === "CANTEEN_STAFF" && req.user.canteenId === order.canteenId;
    const isAdmin = req.user.role === "ADMIN";

    if (!isOwner && !isStaff && !isAdmin) {
      sendError(res, "Access denied to this order", 403);
      return;
    }

    sendSuccess(res, formatOrderResponse(order));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch order", 500);
  }
};

export const cancelOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }

    const id = String(req.params.id);
    const { reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }

    if (order.studentId !== req.user.id && req.user.role !== "ADMIN") {
      sendError(res, "You can only cancel your own orders", 403);
      return;
    }

    const updated = await updateOrderStatus(
      id,
      OrderStatus.CANCELLED,
      reason || "Cancelled by student"
    );

    sendSuccess(res, updated, "Order cancelled successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to cancel order", 400);
  }
};
