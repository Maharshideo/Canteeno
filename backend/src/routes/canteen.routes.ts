import { Router } from "express";
import { getCanteens, getCanteenById, getCanteenMenu } from "../controllers/canteen.controller.js";

const router = Router();

router.get("/", getCanteens);
router.get("/:id", getCanteenById);
router.get("/:id/menu", getCanteenMenu);

export default router;
