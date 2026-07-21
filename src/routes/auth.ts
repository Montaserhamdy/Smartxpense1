import { Router } from "express";
import { register, login, me, logout } from "../controllers/authController.js";
import { forgotPassword, resetPassword } from "../controllers/passwordController.js";
import { authenticate } from "../middleware/authenticate.js";
import { changePassword, updateProfile } from "../controllers/userController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, me);
router.post("/logout", authenticate, logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// protected endpoints
router.post("/change-password", authenticate, changePassword);
router.patch("/me", authenticate, updateProfile);

export default router;
