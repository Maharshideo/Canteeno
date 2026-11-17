import { Router } from "express";
import authRoutes from "./auth.routes.js";
import canteenRoutes from "./canteen.routes.js";
import foodRoutes from "./food.routes.js";
import categoryRoutes from "./category.routes.js";
import orderRoutes from "./order.routes.js";
import reviewRoutes from "./review.routes.js";
import notificationRoutes from "./notification.routes.js";
import staffRoutes from "./staff.routes.js";
import adminRoutes from "./admin.routes.js";
import { uploadImage } from "../services/upload.service.js";
import { authenticateJWT, requireCanteenStaff } from "../middleware/auth.middleware.js";
import multer from "multer";
import { sendError, sendSuccess } from "../utils/response.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = Router();

router.use("/auth", authRoutes);
router.use("/canteens", canteenRoutes);
router.use("/food", foodRoutes);
router.use("/categories", categoryRoutes);
router.use("/orders", orderRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/staff", staffRoutes);
router.use("/admin", adminRoutes);

// Image upload route (for staff/admin to upload food pictures)
router.post(
  "/upload",
  authenticateJWT,
  requireCanteenStaff,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return sendError(res, "No file uploaded", 400);
      }
      const url = await uploadImage(req.file.buffer);
      sendSuccess(res, { url }, "Image uploaded successfully");
    } catch (err: any) {
      sendError(res, err.message || "Failed to upload image", 500);
    }
  }
);

// Health check endpoint
router.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    platform: "Canteeno API",
    time: new Date().toISOString(),
  });
});

export default router;
