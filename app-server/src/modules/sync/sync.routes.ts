import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { validateRequest } from "../../middleware/validateRequest.js";
import { fullSyncController, pullSyncController, pushSyncController } from "./sync.controller.js";
import { syncFullSchema, syncPullQuerySchema, syncPushSchema } from "./sync.validation.js";

export const syncRouter = Router();

syncRouter.post("/push", validateRequest({ body: syncPushSchema }), asyncHandler(pushSyncController));
syncRouter.get("/pull", validateRequest({ query: syncPullQuerySchema }), asyncHandler(pullSyncController));
syncRouter.post("/full", validateRequest({ body: syncFullSchema }), asyncHandler(fullSyncController));
