import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createAdminCompanyController,
  createAdminCompanyAdminController,
  createAdminCompanyLicenseBundleController,
  getAdminCompanyController,
  listAdminCompanyAdminsController,
  listAdminCompaniesController,
  updateAdminCompanyController,
} from "./companies.admin.controller.js";
import {
  adminCompanyIdParamsSchema,
  createAdminCompanyLicenseBundleSchema,
  createAdminCompanySchema,
  updateAdminCompanySchema,
} from "./companies.admin.validation.js";
import { createOwnerAdminUserSchema } from "../ownerUsers/ownerUsers.admin.validation.js";

export const adminCompaniesRouter = Router();

adminCompaniesRouter.get("/", asyncHandler(listAdminCompaniesController));

adminCompaniesRouter.post(
  "/",
  validateRequest({ body: createAdminCompanySchema }),
  asyncHandler(createAdminCompanyController),
);

adminCompaniesRouter.get(
  "/:id",
  validateRequest({ params: adminCompanyIdParamsSchema }),
  asyncHandler(getAdminCompanyController),
);

adminCompaniesRouter.patch(
  "/:id",
  validateRequest({
    params: adminCompanyIdParamsSchema,
    body: updateAdminCompanySchema,
  }),
  asyncHandler(updateAdminCompanyController),
);

adminCompaniesRouter.post(
  "/:id/create-admin-license",
  validateRequest({
    params: adminCompanyIdParamsSchema,
    body: createAdminCompanyLicenseBundleSchema,
  }),
  asyncHandler(createAdminCompanyLicenseBundleController),
);

adminCompaniesRouter.get(
  "/:id/admins",
  validateRequest({ params: adminCompanyIdParamsSchema }),
  asyncHandler(listAdminCompanyAdminsController),
);

adminCompaniesRouter.post(
  "/:id/admins",
  validateRequest({
    params: adminCompanyIdParamsSchema,
    body: createOwnerAdminUserSchema,
  }),
  asyncHandler(createAdminCompanyAdminController),
);
