import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { formatFoodItem } from "../utils/foodFormatter.js";
import { canteenWhere } from "../utils/prismaHelpers.js";

export const getFoods = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { canteenId, categoryId, search, vegOnly, popular } = req.query;

    const where: any = {
      isAvailable: true,
    };

    if (canteenId) {
      // Find canteen if passed by code or id
      const canteen = await prisma.canteen.findFirst({
        where: canteenWhere(String(canteenId)),
      });
      if (canteen) {
        where.canteenId = canteen.id;
      }
    }

    if (categoryId) {
      where.categoryId = String(categoryId);
    }

    if (vegOnly === "true") {
      where.isVeg = true;
    }

    if (popular === "true") {
      where.popular = true;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const foods = await prisma.foodItem.findMany({
      where,
      include: {
        canteen: {
          select: {
            id: true,
            name: true,
            code: true,
            isOpen: true,
            acceptingOrders: true,
          },
        },
        categoryRel: true,
      },
      orderBy: [{ popular: "desc" }, { name: "asc" }],
    });

    sendSuccess(res, foods.map(formatFoodItem));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch food items", 500);
  }
};

export const getFoodById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const food = await prisma.foodItem.findUnique({
      where: { id },
      include: {
        canteen: {
          select: {
            id: true,
            name: true,
            code: true,
            isOpen: true,
            acceptingOrders: true,
          },
        },
        categoryRel: true,
      },
    });

    if (!food) {
      sendError(res, "Food item not found", 404);
      return;
    }

    sendSuccess(res, formatFoodItem(food));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch food item", 500);
  }
};
