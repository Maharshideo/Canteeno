import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";

export const getCategories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, categories);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch categories", 500);
  }
};
