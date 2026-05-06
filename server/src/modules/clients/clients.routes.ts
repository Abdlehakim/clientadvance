import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { roleMiddleware } from "../../middleware/roleMiddleware.js";
import {
  createClientController,
  deleteClientController,
  getClientByIdController,
  getClientsController,
  updateClientController,
} from "./clients.controller.js";
import { clientParamsSchema, createClientSchema, updateClientSchema } from "./clients.validation.js";

export const clientsRouter = Router();

clientsRouter.get("/", asyncHandler(getClientsController));
clientsRouter.get("/:id", validateRequest({ params: clientParamsSchema }), asyncHandler(getClientByIdController));
clientsRouter.post("/", validateRequest({ body: createClientSchema }), asyncHandler(createClientController));
clientsRouter.put(
  "/:id",
  validateRequest({ params: clientParamsSchema, body: updateClientSchema }),
  asyncHandler(updateClientController),
);
clientsRouter.delete(
  "/:id",
  roleMiddleware("admin"),
  validateRequest({ params: clientParamsSchema }),
  asyncHandler(deleteClientController),
);