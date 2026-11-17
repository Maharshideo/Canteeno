import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";

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
      where: {
        OR: [{ id }, { code: id }],
      },
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
      where: {
        OR: [{ id }, { code: id }],
      },
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

    sendSuccess(res, foods);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch menu", 500);
  }
};
