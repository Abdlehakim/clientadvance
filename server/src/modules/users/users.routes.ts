import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { getUserByIdController, getUsersController } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/", asyncHandler(getUsersController));
usersRouter.get("/:id", asyncHandler(getUserByIdController));
