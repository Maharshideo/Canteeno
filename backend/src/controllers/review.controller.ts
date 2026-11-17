import { Response } from "express";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { canteenWhere } from "../utils/prismaHelpers.js";

export const createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "Please log in to submit a review", 401);
      return;
    }

    const { canteenId, orderId, rating, comment } = req.body;

    const canteen = await prisma.canteen.findFirst({
      where: canteenWhere(canteenId),
    });

    if (!canteen) {
      sendError(res, "Canteen not found", 404);
      return;
    }

    const review = await prisma.review.create({
      data: {
        studentId: req.user.id,
        studentName: req.user.name,
        canteenId: canteen.id,
        orderId,
        rating,
        comment,
        status: "published",
      },
    });

    // Mark order as reviewed if orderId provided
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, studentId: req.user.id },
        data: { reviewed: true },
      });
    }

    // Recompute canteen rating
    const reviews = await prisma.review.findMany({
      where: { canteenId: canteen.id, status: "published" },
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await prisma.canteen.update({
      where: { id: canteen.id },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        ratingCount: reviews.length,
      },
    });

    sendSuccess(
      res,
      {
        id: review.id,
        userId: review.studentId,
        studentName: review.studentName,
        canteenId: review.canteenId,
        orderId: review.orderId,
        rating: review.rating,
        comment: review.comment,
        at: review.createdAt.toISOString(),
        status: review.status,
      },
      "Review submitted successfully",
      201
    );
  } catch (err: any) {
    sendError(res, err.message || "Failed to submit review", 500);
  }
};

export const getReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { canteenId } = req.query;

    const where: any = {
      status: "published",
    };

    if (canteenId) {
      const canteen = await prisma.canteen.findFirst({
        where: canteenWhere(String(canteenId)),
      });
      if (canteen) {
        where.canteenId = canteen.id;
      }
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      userId: r.studentId,
      studentName: r.studentName,
      canteenId: r.canteenId,
      orderId: r.orderId,
      rating: r.rating,
      comment: r.comment,
      at: r.createdAt.toISOString(),
      status: r.status,
      reply: r.reply,
    }));

    sendSuccess(res, formatted);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch reviews", 500);
  }
};
