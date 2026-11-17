import { Router } from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notification.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateJWT);

router.get("/", getNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllNotificationsRead);

export default router;
