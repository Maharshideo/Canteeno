import { Router } from "express";
import { getFoods, getFoodById } from "../controllers/food.controller.js";

const router = Router();

router.get("/", getFoods);
router.get("/:id", getFoodById);

export default router;
