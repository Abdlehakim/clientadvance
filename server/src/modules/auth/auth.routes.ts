import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { loginController, logoutController, meController } from "./auth.controller.js";
import { loginSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/login", validateRequest({ body: loginSchema }), asyncHandler(loginController));
authRouter.get("/me", authMiddleware, asyncHandler(meController));
authRouter.post("/logout", authMiddleware, asyncHandler(logoutController));
