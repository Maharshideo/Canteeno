import { Router } from "express";
import { createReview, getReviews } from "../controllers/review.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { createReviewSchema } from "../validators/review.validator.js";

const router = Router();

router.get("/", getReviews);
router.post("/", authenticateJWT, validateRequest({ body: createReviewSchema }), createReview);

export default router;
