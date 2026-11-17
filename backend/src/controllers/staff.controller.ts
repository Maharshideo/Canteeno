import { Response } from "express";
import { OrderStatus, Role } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { formatOrderResponse, updateOrderStatus } from "../services/order.service.js";
import { notifyCanteen } from "../services/socket.service.js";
import { canteenWhere } from "../utils/prismaHelpers.js";

const getStaffCanteenId = async (req: AuthenticatedRequest): Promise<string> => {
  // If user has canteenId in token/profile, return it
  if (req.user?.canteenId) return req.user.canteenId;

  // If admin, they can pass ?canteenId in query
  if (req.user?.role === Role.ADMIN && req.query.canteenId) {
    const c = await prisma.canteen.findFirst({
      where: canteenWhere(String(req.query.canteenId)),
    });
    if (c) return c.id;
  }

  // Fallback to Nescafe if none set in demo
  const nescafe = await prisma.canteen.findFirst({ where: { code: "nescafe" } });
  return nescafe?.id || "";
};

export const getStaffDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteenId = await getStaffCanteenId(req);
    if (!canteenId) {
      sendError(res, "No canteen associated with this staff account", 400);
      return;
    }

    const canteen = await prisma.canteen.findUnique({
      where: { id: canteenId },
    });
    if (!canteen) {
      sendError(res, "Canteen not found", 404);
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { canteenId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    const todayOrders = orders.filter((o) => o.createdAt >= startOfDay);
    const incomingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
    const activeOrders = orders.filter((o) =>
      ([OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP] as OrderStatus[]).includes(o.status)
    );
    const collectedToday = todayOrders.filter((o) => o.status === OrderStatus.COLLECTED);
    const revenueToday = collectedToday.reduce((sum, o) => sum + o.totalAmount, 0);

    const avgPrep = activeOrders.length
      ? Math.round(activeOrders.reduce((sum, o) => sum + o.estimatedPreparationTime, 0) / activeOrders.length)
      : canteen.prepTime;

    const outOfStockFoods = await prisma.foodItem.findMany({
      where: { canteenId, inStock: false },
    });

    sendSuccess(res, {
      canteen,
      stats: {
        ordersToday: todayOrders.length,
        collectedToday: collectedToday.length,
        waitingToAccept: incomingOrders.length,
        revenueToday,
        avgPrepMinutes: avgPrep,
        activeOrdersCount: activeOrders.length,
        outOfStockCount: outOfStockFoods.length,
      },
      incoming: incomingOrders.map(formatOrderResponse),
      active: activeOrders.map(formatOrderResponse),
      outOfStockFoods,
    });
  } catch (err: any) {
    sendError(res, err.message || "Failed to load staff dashboard", 500);
  }
};

export const getStaffOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteenId = await getStaffCanteenId(req);
    if (!canteenId) {
      sendError(res, "No canteen associated with this account", 400);
      return;
    }

    const orders = await prisma.order.findMany({
      where: { canteenId },
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true, image: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, orders.map(formatOrderResponse));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch staff orders", 500);
  }
};

export const acceptOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);
    const updated = await updateOrderStatus(id, OrderStatus.ACCEPTED, undefined, canteenId);
    sendSuccess(res, updated, "Order accepted");
  } catch (err: any) {
    sendError(res, err.message || "Failed to accept order", 400);
  }
};

export const rejectOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;
    const canteenId = await getStaffCanteenId(req);
    const updated = await updateOrderStatus(
      id,
      OrderStatus.REJECTED,
      reason || "Rejected by canteen staff",
      canteenId
    );
    sendSuccess(res, updated, "Order rejected");
  } catch (err: any) {
    sendError(res, err.message || "Failed to reject order", 400);
  }
};

export const markOrderPreparing = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);
    const updated = await updateOrderStatus(id, OrderStatus.PREPARING, undefined, canteenId);
    sendSuccess(res, updated, "Order is being prepared");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update order to preparing", 400);
  }
};

export const markOrderReady = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);
    const updated = await updateOrderStatus(id, OrderStatus.READY_FOR_PICKUP, undefined, canteenId);
    sendSuccess(res, updated, "Order is ready for pickup");
  } catch (err: any) {
    sendError(res, err.message || "Failed to mark order ready", 400);
  }
};

export const markOrderCollected = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);
    const updated = await updateOrderStatus(id, OrderStatus.COLLECTED, undefined, canteenId);
    sendSuccess(res, updated, "Order marked collected");
  } catch (err: any) {
    sendError(res, err.message || "Failed to mark order collected", 400);
  }
};

export const updateOrderPrepTime = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { minutes } = req.body;
    const canteenId = await getStaffCanteenId(req);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      sendError(res, "Order not found", 404);
      return;
    }
    if (order.canteenId !== canteenId && req.user?.role !== Role.ADMIN) {
      sendError(res, "Unauthorized for this order", 403);
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { estimatedPreparationTime: Math.max(1, Math.min(120, minutes)) },
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true, image: true, phone: true },
        },
      },
    });

    const formatted = formatOrderResponse(updated);
    notifyCanteen(order.canteenId, "order:status_updated", formatted);

    sendSuccess(res, formatted, "Preparation time updated");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update prep time", 400);
  }
};

export const createFood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteenId = req.body.canteenId || (await getStaffCanteenId(req));
    if (!canteenId) {
      sendError(res, "Canteen ID required", 400);
      return;
    }

    const {
      name,
      description,
      price,
      categoryId,
      isVeg,
      image,
      preparationTime,
      inStock,
      isAvailable,
      popular,
      recommended,
    } = req.body;

    const food = await prisma.foodItem.create({
      data: {
        name,
        description: description || "",
        price: Number(price),
        categoryId: categoryId || null,
        isVeg: Boolean(isVeg),
        image: image || "",
        preparationTime: preparationTime ? Number(preparationTime) : 10,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        popular: Boolean(popular),
        recommended: Boolean(recommended),
        canteenId,
      },
      include: { categoryRel: true },
    });

    sendSuccess(res, food, "Food item created successfully", 201);
  } catch (err: any) {
    sendError(res, err.message || "Failed to create food item", 500);
  }
};

export const updateFood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);

    const food = await prisma.foodItem.findUnique({ where: { id } });
    if (!food) {
      sendError(res, "Food item not found", 404);
      return;
    }
    if (food.canteenId !== canteenId && req.user?.role !== Role.ADMIN) {
      sendError(res, "Unauthorized: food item belongs to another canteen", 403);
      return;
    }

    const {
      name,
      description,
      price,
      categoryId,
      isVeg,
      image,
      preparationTime,
      inStock,
      isAvailable,
      popular,
      recommended,
    } = req.body;

    const updated = await prisma.foodItem.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(isVeg !== undefined ? { isVeg: Boolean(isVeg) } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(preparationTime !== undefined ? { preparationTime: Number(preparationTime) } : {}),
        ...(inStock !== undefined ? { inStock: Boolean(inStock) } : {}),
        ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
        ...(popular !== undefined ? { popular: Boolean(popular) } : {}),
        ...(recommended !== undefined ? { recommended: Boolean(recommended) } : {}),
      },
      include: { categoryRel: true },
    });

    sendSuccess(res, updated, "Food item updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update food item", 500);
  }
};

export const deleteFood = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const canteenId = await getStaffCanteenId(req);

    const food = await prisma.foodItem.findUnique({ where: { id } });
    if (!food) {
      sendError(res, "Food item not found", 404);
      return;
    }
    if (food.canteenId !== canteenId && req.user?.role !== Role.ADMIN) {
      sendError(res, "Unauthorized: food item belongs to another canteen", 403);
      return;
    }

    await prisma.foodItem.delete({ where: { id } });
    sendSuccess(res, { ok: true }, "Food item deleted successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to delete food item", 500);
  }
};

export const patchFoodAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { inStock, isAvailable } = req.body;
    const canteenId = await getStaffCanteenId(req);

    const food = await prisma.foodItem.findUnique({ where: { id } });
    if (!food) {
      sendError(res, "Food item not found", 404);
      return;
    }
    if (food.canteenId !== canteenId && req.user?.role !== Role.ADMIN) {
      sendError(res, "Unauthorized", 403);
      return;
    }

    const updated = await prisma.foodItem.update({
      where: { id },
      data: {
        ...(inStock !== undefined ? { inStock: Boolean(inStock) } : {}),
        ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
      },
    });

    sendSuccess(res, updated, "Availability updated");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update food availability", 500);
  }
};

export const updateCanteenStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteenId = await getStaffCanteenId(req);
    const { isOpen, acceptingOrders } = req.body;

    const updated = await prisma.canteen.update({
      where: { id: canteenId },
      data: {
        ...(isOpen !== undefined ? { isOpen: Boolean(isOpen) } : {}),
        ...(acceptingOrders !== undefined ? { acceptingOrders: Boolean(acceptingOrders) } : {}),
      },
    });

    sendSuccess(res, updated, "Canteen status updated");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update canteen status", 500);
  }
};

export const getStaffAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteenId = await getStaffCanteenId(req);
    const orders = await prisma.order.findMany({
      where: { canteenId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    // Compute metrics
    const totalOrders = orders.length;
    const collectedOrders = orders.filter((o) => o.status === OrderStatus.COLLECTED);
    const totalRevenue = collectedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Item sales breakdown
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const order of collectedOrders) {
      for (const item of order.items) {
        if (!itemSales[item.itemName]) {
          itemSales[item.itemName] = { name: item.itemName, quantity: 0, revenue: 0 };
        }
        itemSales[item.itemName].quantity += item.quantity;
        itemSales[item.itemName].revenue += item.subtotal;
      }
    }

    const topItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    sendSuccess(res, {
      totalOrders,
      collectedOrdersCount: collectedOrders.length,
      totalRevenue,
      topItems,
    });
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch staff analytics", 500);
  }
};
