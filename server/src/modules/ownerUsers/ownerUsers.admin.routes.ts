import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  disableOwnerAdminUserController,
  enableOwnerAdminUserController,
  listOwnerAdminUsersController,
  resetOwnerAdminUserPasswordController,
  updateOwnerAdminUserController,
} from "./ownerUsers.admin.controller.js";
import {
  ownerAdminUserIdParamsSchema,
  resetOwnerAdminPasswordSchema,
  updateOwnerAdminUserSchema,
} from "./ownerUsers.admin.validation.js";

export const ownerAdminUsersRouter = Router();

ownerAdminUsersRouter.get("/", asyncHandler(listOwnerAdminUsersController));

ownerAdminUsersRouter.patch(
  "/:id",
  validateRequest({
    params: ownerAdminUserIdParamsSchema,
    body: updateOwnerAdminUserSchema,
  }),
  asyncHandler(updateOwnerAdminUserController),
);

ownerAdminUsersRouter.post(
  "/:id/reset-password",
  validateRequest({
    params: ownerAdminUserIdParamsSchema,
    body: resetOwnerAdminPasswordSchema,
  }),
  asyncHandler(resetOwnerAdminUserPasswordController),
);

ownerAdminUsersRouter.post(
  "/:id/disable",
  validateRequest({ params: ownerAdminUserIdParamsSchema }),
  asyncHandler(disableOwnerAdminUserController),
);

ownerAdminUsersRouter.post(
  "/:id/enable",
  validateRequest({ params: ownerAdminUserIdParamsSchema }),
  asyncHandler(enableOwnerAdminUserController),
);
