import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  activateLicenseController,
  checkLicenseController,
} from "./licenses.controller.js";
import {
  activateLicenseSchema,
  checkLicenseSchema,
} from "./licenses.validation.js";

export const licensesRoutes = Router();

licensesRoutes.post(
  "/activate",
  validateRequest({ body: activateLicenseSchema }),
  asyncHandler(activateLicenseController),
);

licensesRoutes.post(
  "/check",
  validateRequest({ body: checkLicenseSchema }),
  asyncHandler(checkLicenseController),
);

export const licensesRouter = licensesRoutes;
