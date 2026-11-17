import { Router } from "express";
import { Role } from "@prisma/client";
import {
  getAdminDashboard,
  getAdminUsers,
  updateStudentStatus,
  getAdminCanteens,
  createCanteen,
  updateCanteen,
  deleteCanteen,
  getAdminOrders,
  getAdminReviews,
  patchAdminReview,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminSettings,
  updateAdminSettings,
  getAdminAnalytics,
} from "../controllers/admin.controller.js";
import { authenticateJWT, requireRole } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createCanteenSchema, updateCanteenSchema } from "../validators/canteen.validator.js";

const router = Router();

// Admin routes require ADMIN role
router.use(authenticateJWT, requireRole(Role.ADMIN));

router.get("/dashboard", getAdminDashboard);
router.get("/users", getAdminUsers);
router.patch("/users/:id/status", updateStudentStatus);

router.get("/canteens", getAdminCanteens);
router.post("/canteens", validateRequest({ body: createCanteenSchema }), createCanteen);
router.put("/canteens/:id", validateRequest({ body: updateCanteenSchema }), updateCanteen);
router.delete("/canteens/:id", deleteCanteen);

router.get("/orders", getAdminOrders);
router.get("/reviews", getAdminReviews);
router.patch("/reviews/:id", patchAdminReview);

router.get("/categories", getAdminCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/settings", getAdminSettings);
router.patch("/settings", updateAdminSettings);
router.get("/analytics", getAdminAnalytics);

export default router;
