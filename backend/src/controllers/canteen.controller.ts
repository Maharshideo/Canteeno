import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { calculateHistoricalETA } from "../utils/historicalETA.js";
import { formatFoodItem } from "../utils/foodFormatter.js";
import { canteenWhere } from "../utils/prismaHelpers.js";

export const getCanteens = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { openOnly } = req.query;

    const where: any = {};
    if (openOnly === "true") {
      where.isOpen = true;
      where.acceptingOrders = true;
    }

    const canteens = await prisma.canteen.findMany({
      where,
      orderBy: [{ featured: "desc" }, { name: "asc" }],
    });

    sendSuccess(res, canteens);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch canteens", 500);
  }
};

export const getCanteenById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    // Support lookup by MongoDB ObjectId or short code (e.g. "nescafe", "annapurna")
    const canteen = await prisma.canteen.findFirst({
      where: canteenWhere(id),
    });

    if (!canteen) {
      sendError(res, "Canteen not found", 404);
      return;
    }

    sendSuccess(res, canteen);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch canteen", 500);
  }
};

export const getCanteenMenu = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const canteen = await prisma.canteen.findFirst({
      where: canteenWhere(id),
    });

    if (!canteen) {
      sendError(res, "Canteen not found", 404);
      return;
    }

    const foods = await prisma.foodItem.findMany({
      where: {
        canteenId: canteen.id,
        isAvailable: true,
      },
      include: {
        categoryRel: true,
      },
      orderBy: [{ popular: "desc" }, { name: "asc" }],
    });

    sendSuccess(res, foods.map(formatFoodItem));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch menu", 500);
  }
};

/**
 * GET /api/canteens/:id/eta
 * Public endpoint – returns a smart estimated wait time for a new order
 * at the specified canteen, based on:
 *   • Historical average prep time (placed → ready) of recent COLLECTED orders
 *   • Current queue length (PENDING + ACCEPTED + PREPARING orders)
 *
 * The estimate is an approximation. It must NOT be presented as a guarantee.
 */
export const getCanteenETA = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    // Resolve by ObjectId OR canteen code
    const canteen = await prisma.canteen.findFirst({
      where: canteenWhere(id),
      select: { id: true, name: true, prepTime: true },
    });

    if (!canteen) {
      sendError(res, "Canteen not found", 404);
      return;
    }

    const eta = await calculateHistoricalETA(canteen.id);
    sendSuccess(res, { canteenId: canteen.id, canteenName: canteen.name, ...eta });
  } catch (err: any) {
    sendError(res, err.message || "Failed to calculate ETA", 500);
  }
};
