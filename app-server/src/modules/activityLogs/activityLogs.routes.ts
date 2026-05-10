import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { getActivityLogsController, createActivityLogController } from "./activityLogs.controller.js";
import { createActivityLogSchema } from "./activityLogs.validation.js";

export const activityLogsRouter = Router();

activityLogsRouter.get("/", asyncHandler(getActivityLogsController));
activityLogsRouter.post(
  "/",
  validateRequest({ body: createActivityLogSchema }),
  asyncHandler(createActivityLogController),
);