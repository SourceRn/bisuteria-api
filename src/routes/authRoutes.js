import { Router } from "express";
import { login } from "../controllers/authController.js";
import { limiteLogin } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/login", limiteLogin, login);

export default router;