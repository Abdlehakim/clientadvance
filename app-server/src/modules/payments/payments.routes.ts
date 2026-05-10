import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createPaymentController, getPaymentsByClientController, getPaymentsController } from "./payments.controller.js";
import { createPaymentSchema, paymentParamsSchema } from "./payments.validation.js";

export const paymentsRouter = Router();

paymentsRouter.get("/", asyncHandler(getPaymentsController));
paymentsRouter.get(
  "/client/:clientId",
  validateRequest({ params: paymentParamsSchema }),
  asyncHandler(getPaymentsByClientController),
);
paymentsRouter.post("/", validateRequest({ body: createPaymentSchema }), asyncHandler(createPaymentController));
