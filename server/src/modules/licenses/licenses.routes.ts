import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { activateLicenseController } from "./licenses.controller.js";
import { activateLicenseSchema } from "./licenses.validation.js";

export const licensesRouter = Router();

licensesRouter.post(
  "/activate",
  validateRequest({ body: activateLicenseSchema }),
  asyncHandler(activateLicenseController),
);
