import { Router } from "express";
import {
  getStaffDashboard,
  getStaffOrders,
  acceptOrder,
  rejectOrder,
  markOrderPreparing,
  markOrderReady,
  markOrderCollected,
  updateOrderPrepTime,
  createFood,
  updateFood,
  deleteFood,
  patchFoodAvailability,
  updateCanteenStatus,
  getStaffAnalytics,
} from "../controllers/staff.controller.js";
import { authenticateJWT, requireCanteenStaff } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { rejectOrderSchema, updatePrepTimeSchema } from "../validators/order.validator.js";
import {
  createFoodSchema,
  updateFoodSchema,
  updateFoodAvailabilitySchema,
} from "../validators/food.validator.js";
import { updateCanteenStatusSchema } from "../validators/canteen.validator.js";

const router = Router();

// Staff routes are protected and require staff/admin role
router.use(authenticateJWT, requireCanteenStaff);

router.get("/dashboard", getStaffDashboard);
router.get("/orders", getStaffOrders);
router.patch("/orders/:id/accept", acceptOrder);
router.patch("/orders/:id/reject", validateRequest({ body: rejectOrderSchema }), rejectOrder);
router.patch("/orders/:id/preparing", markOrderPreparing);
router.patch("/orders/:id/ready", markOrderReady);
router.patch("/orders/:id/collected", markOrderCollected);
router.patch("/orders/:id/prep-time", validateRequest({ body: updatePrepTimeSchema }), updateOrderPrepTime);

router.post("/food", validateRequest({ body: createFoodSchema }), createFood);
router.put("/food/:id", validateRequest({ body: updateFoodSchema }), updateFood);
router.delete("/food/:id", deleteFood);
router.patch("/food/:id/availability", validateRequest({ body: updateFoodAvailabilitySchema }), patchFoodAvailability);

router.patch("/canteen/status", validateRequest({ body: updateCanteenStatusSchema }), updateCanteenStatus);
router.get("/analytics", getStaffAnalytics);

export default router;
