import { Response } from "express";
import { OrderStatus, Role } from "@prisma/client";
import { prisma } from "../config/database.js";
import { AuthenticatedRequest } from "../types/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { formatOrderResponse } from "../services/order.service.js";

export const getAdminDashboard = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalStudents = await prisma.user.count({ where: { role: Role.STUDENT } });
    const totalCanteens = await prisma.canteen.count();
    const openCanteens = await prisma.canteen.count({ where: { isOpen: true } });
    const totalOrders = await prisma.order.count();
    const collectedOrders = await prisma.order.findMany({
      where: { status: OrderStatus.COLLECTED },
      select: { totalAmount: true },
    });
    const totalRevenue = collectedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const recentOrders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true },
        },
      },
    });

    sendSuccess(res, {
      stats: {
        totalUsers,
        totalStudents,
        totalCanteens,
        openCanteens,
        totalOrders,
        totalRevenue,
      },
      recentOrders: recentOrders.map(formatOrderResponse),
    });
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch admin dashboard", 500);
  }
};

export const getAdminUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
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
        createdAt: true,
        _count: {
          select: { orders: true, reviews: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, users);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch users", 500);
  }
};

export const updateStudentStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      sendError(res, "Status must be 'active' or 'suspended'", 400);
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, name: true, email: true, status: true },
    });

    sendSuccess(res, updated, `Student status updated to ${status}`);
  } catch (err: any) {
    sendError(res, err.message || "Failed to update student status", 500);
  }
};

export const getAdminCanteens = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteens = await prisma.canteen.findMany({
      include: {
        _count: {
          select: { foods: true, orders: true, reviews: true },
        },
      },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, canteens);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch canteens", 500);
  }
};

export const createCanteen = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      code,
      tagline,
      description,
      location,
      cuisine,
      image,
      openingTime,
      closingTime,
      openingHours,
      isOpen,
      acceptingOrders,
      featured,
      phone,
      prepTime,
      isDemo,
    } = req.body;

    const shortCode = (code || name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)) || "outlet";

    const canteen = await prisma.canteen.create({
      data: {
        name,
        code: shortCode,
        tagline: tagline || "",
        description: description || "",
        location,
        cuisine: cuisine || [],
        image: image || "",
        openingTime: openingTime || "08:00",
        closingTime: closingTime || "22:00",
        openingHours: openingHours || undefined,
        isOpen: isOpen !== undefined ? Boolean(isOpen) : true,
        acceptingOrders: acceptingOrders !== undefined ? Boolean(acceptingOrders) : true,
        featured: Boolean(featured),
        phone: phone || "",
        prepTime: prepTime ? Number(prepTime) : 15,
        isDemo: isDemo !== undefined ? Boolean(isDemo) : true,
      },
    });

    sendSuccess(res, canteen, "Canteen created successfully", 201);
  } catch (err: any) {
    sendError(res, err.message || "Failed to create canteen", 500);
  }
};

export const updateCanteen = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const data = req.body;

    const canteen = await prisma.canteen.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.cuisine !== undefined ? { cuisine: data.cuisine } : {}),
        ...(data.image !== undefined ? { image: data.image } : {}),
        ...(data.openingTime !== undefined ? { openingTime: data.openingTime } : {}),
        ...(data.closingTime !== undefined ? { closingTime: data.closingTime } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
        ...(data.isOpen !== undefined ? { isOpen: Boolean(data.isOpen) } : {}),
        ...(data.acceptingOrders !== undefined ? { acceptingOrders: Boolean(data.acceptingOrders) } : {}),
        ...(data.featured !== undefined ? { featured: Boolean(data.featured) } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.prepTime !== undefined ? { prepTime: Number(data.prepTime) } : {}),
        ...(data.isDemo !== undefined ? { isDemo: Boolean(data.isDemo) } : {}),
      },
    });

    sendSuccess(res, canteen, "Canteen updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update canteen", 500);
  }
};

export const deleteCanteen = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    // Delete foods and canteen
    await prisma.foodItem.deleteMany({ where: { canteenId: id } });
    await prisma.canteen.delete({ where: { id } });

    sendSuccess(res, { ok: true }, "Canteen deleted successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to delete canteen", 500);
  }
};

export const getAdminOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { canteenId, status } = req.query;

    const where: any = {};
    if (canteenId) where.canteenId = String(canteenId);
    if (status) where.status = String(status).toUpperCase();

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        canteen: {
          select: { id: true, name: true, code: true, location: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, orders.map(formatOrderResponse));
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch orders", 500);
  }
};

export const getAdminReviews = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        canteen: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    sendSuccess(res, reviews);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch reviews", 500);
  }
};

export const patchAdminReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, reply } = req.body;

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(reply !== undefined ? { reply } : {}),
      },
    });

    sendSuccess(res, updated, "Review updated");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update review", 500);
  }
};

export const getAdminCategories = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { foods: true } },
      },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, categories);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch categories", 500);
  }
};

export const createCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, icon, image, active } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon: icon || "Utensils",
        image: image || null,
        active: active !== undefined ? Boolean(active) : true,
      },
    });

    sendSuccess(res, category, "Category created successfully", 201);
  } catch (err: any) {
    sendError(res, err.message || "Failed to create category", 500);
  }
};

export const updateCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { name, icon, image, active } = req.body;

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") } : {}),
        ...(icon ? { icon } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
      },
    });

    sendSuccess(res, updated, "Category updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update category", 500);
  }
};

export const deleteCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const foodsCount = await prisma.foodItem.count({ where: { categoryId: id } });
    if (foodsCount > 0) {
      sendError(
        res,
        `${foodsCount} food items still use this category. Move them or hide the category instead.`,
        400
      );
      return;
    }

    await prisma.category.delete({ where: { id } });
    sendSuccess(res, { ok: true }, "Category deleted successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to delete category", 500);
  }
};

export const getAdminSettings = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let settings = await prisma.platformSettings.findFirst();
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          platformName: "Canteeno",
          campusName: "Campus Central",
          orderingEnabled: true,
          maxActiveOrders: 3,
          pickupHoldMinutes: 20,
          supportEmail: "canteen-support@campus.edu",
          allowUpi: false,
        },
      });
    }

    sendSuccess(res, settings);
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch platform settings", 500);
  }
};

export const updateAdminSettings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    let settings = await prisma.platformSettings.findFirst();

    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: {
          platformName: data.platformName || "Canteeno",
          campusName: data.campusName || "Campus Central",
          orderingEnabled: data.orderingEnabled !== undefined ? Boolean(data.orderingEnabled) : true,
          maxActiveOrders: data.maxActiveOrders ? Number(data.maxActiveOrders) : 3,
          pickupHoldMinutes: data.pickupHoldMinutes ? Number(data.pickupHoldMinutes) : 20,
          supportEmail: data.supportEmail || "canteen-support@campus.edu",
          allowUpi: Boolean(data.allowUpi),
        },
      });
    } else {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: {
          ...(data.platformName !== undefined ? { platformName: data.platformName } : {}),
          ...(data.campusName !== undefined ? { campusName: data.campusName } : {}),
          ...(data.orderingEnabled !== undefined ? { orderingEnabled: Boolean(data.orderingEnabled) } : {}),
          ...(data.maxActiveOrders !== undefined ? { maxActiveOrders: Number(data.maxActiveOrders) } : {}),
          ...(data.pickupHoldMinutes !== undefined ? { pickupHoldMinutes: Number(data.pickupHoldMinutes) } : {}),
          ...(data.supportEmail !== undefined ? { supportEmail: data.supportEmail } : {}),
          ...(data.allowUpi !== undefined ? { allowUpi: Boolean(data.allowUpi) } : {}),
        },
      });
    }

    sendSuccess(res, settings, "Platform settings updated successfully");
  } catch (err: any) {
    sendError(res, err.message || "Failed to update platform settings", 500);
  }
};

export const getAdminAnalytics = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const canteens = await prisma.canteen.findMany({
      include: {
        orders: {
          where: { status: OrderStatus.COLLECTED },
          select: { totalAmount: true },
        },
      },
    });

    const canteenRevenues = canteens.map((c) => ({
      id: c.id,
      name: c.name,
      ordersCount: c.orders.length,
      revenue: c.orders.reduce((sum, o) => sum + o.totalAmount, 0),
    }));

    sendSuccess(res, {
      canteenRevenues,
    });
  } catch (err: any) {
    sendError(res, err.message || "Failed to fetch analytics", 500);
  }
};
