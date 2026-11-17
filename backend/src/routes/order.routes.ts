import { Router } from "express";
import { placeOrder, getMyOrders, getOrderById, cancelOrder } from "../controllers/order.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createOrderSchema, cancelOrderSchema } from "../validators/order.validator.js";

const router = Router();

router.use(authenticateJWT);

router.post("/", validateRequest({ body: createOrderSchema }), placeOrder);
router.get("/my-orders", getMyOrders);
router.get("/:id", getOrderById);
router.post("/:id/cancel", validateRequest({ body: cancelOrderSchema }), cancelOrder);

export default router;
