import type { Request, Response } from "express";
import { createUser, getUserById, listUsers, updateUser } from "./users.service.js";

export async function getUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  res.json(users);
}

export async function getUserByIdController(req: Request, res: Response) {
  const user = await getUserById(req.params.id!);
  res.json(user);
}

export async function createUserController(req: Request, res: Response) {
  const user = await createUser(req.body, req.user!);
  res.status(201).json(user);
}

export async function updateUserController(req: Request, res: Response) {
  const user = await updateUser(req.params.id!, req.body, req.user!);
  res.json(user);
}
