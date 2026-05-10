import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createAdminLicenseController,
  deactivateAdminLicenseActivationController,
  getAdminLicenseController,
  listAdminLicensesController,
  reactivateAdminLicenseController,
  revokeAdminLicenseController,
  suspendAdminLicenseController,
  updateAdminLicenseController,
} from "./licenses.admin.controller.js";
import {
  adminLicenseActivationParamsSchema,
  adminLicenseIdParamsSchema,
  createAdminLicenseSchema,
  updateAdminLicenseSchema,
} from "./licenses.admin.validation.js";

export const adminLicensesRouter = Router();

adminLicensesRouter.get("/", asyncHandler(listAdminLicensesController));

adminLicensesRouter.get(
  "/:id",
  validateRequest({ params: adminLicenseIdParamsSchema }),
  asyncHandler(getAdminLicenseController),
);

adminLicensesRouter.post(
  "/",
  validateRequest({ body: createAdminLicenseSchema }),
  asyncHandler(createAdminLicenseController),
);

adminLicensesRouter.patch(
  "/:id",
  validateRequest({
    params: adminLicenseIdParamsSchema,
    body: updateAdminLicenseSchema,
  }),
  asyncHandler(updateAdminLicenseController),
);

adminLicensesRouter.post(
  "/:id/revoke",
  validateRequest({ params: adminLicenseIdParamsSchema }),
  asyncHandler(revokeAdminLicenseController),
);

adminLicensesRouter.post(
  "/:id/suspend",
  validateRequest({ params: adminLicenseIdParamsSchema }),
  asyncHandler(suspendAdminLicenseController),
);

adminLicensesRouter.post(
  "/:id/reactivate",
  validateRequest({ params: adminLicenseIdParamsSchema }),
  asyncHandler(reactivateAdminLicenseController),
);

adminLicensesRouter.post(
  "/:id/activations/:activationId/deactivate",
  validateRequest({ params: adminLicenseActivationParamsSchema }),
  asyncHandler(deactivateAdminLicenseActivationController),
);
