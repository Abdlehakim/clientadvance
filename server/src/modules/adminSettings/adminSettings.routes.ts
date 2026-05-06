import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getAdminSettingsController, updateAdminSettingsController } from "./adminSettings.controller.js";
import { updateAdminSettingsSchema } from "./adminSettings.validation.js";

export const adminSettingsRouter = Router();

adminSettingsRouter.get("/", asyncHandler(getAdminSettingsController));
adminSettingsRouter.put(
  "/",
  validateRequest({ body: updateAdminSettingsSchema }),
  asyncHandler(updateAdminSettingsController),
);
