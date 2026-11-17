import { Router } from "express";
import {
  register,
  login,
  getMe,
  updateProfile,
  toggleFavouriteFood,
  toggleFavouriteCanteen,
} from "../controllers/auth.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { validateRequest } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/rateLimiter.middleware.js";
import { registerSchema, loginSchema, updateProfileSchema } from "../validators/auth.validator.js";

const router = Router();

router.post("/register", authLimiter, validateRequest({ body: registerSchema }), register);
router.post("/login", authLimiter, validateRequest({ body: loginSchema }), login);
router.get("/me", authenticateJWT, getMe);
router.patch("/profile", authenticateJWT, validateRequest({ body: updateProfileSchema }), updateProfile);
router.post("/favourites/food/:id", authenticateJWT, toggleFavouriteFood);
router.post("/favourites/canteen/:id", authenticateJWT, toggleFavouriteCanteen);

export default router;
