import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createUserController,
  getUserByIdController,
  getUsersController,
  updateUserController,
} from "./users.controller.js";
import { createUserSchema, updateUserSchema, userParamsSchema } from "./users.validation.js";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(getUsersController));
usersRouter.get("/:id", validateRequest({ params: userParamsSchema }), asyncHandler(getUserByIdController));
usersRouter.post("/", validateRequest({ body: createUserSchema }), asyncHandler(createUserController));
usersRouter.patch(
  "/:id",
  validateRequest({ params: userParamsSchema, body: updateUserSchema }),
  asyncHandler(updateUserController),
);
