import { Router } from "express";
import { getCanteens, getCanteenById, getCanteenMenu, getCanteenETA } from "../controllers/canteen.controller.js";

const router = Router();

router.get("/", getCanteens);
router.get("/:id/eta", getCanteenETA);   // must be before /:id to avoid shadowing
router.get("/:id", getCanteenById);
router.get("/:id/menu", getCanteenMenu);

export default router;
