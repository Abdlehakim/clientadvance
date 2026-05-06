import type { Request, Response } from "express";
import { getUserById, listUsers } from "./users.service.js";

export async function getUsersController(_req: Request, res: Response) {
  const users = await listUsers();
  res.json(users);
}

export async function getUserByIdController(req: Request, res: Response) {
  const user = await getUserById(req.params.id!);
  res.json(user);
}
