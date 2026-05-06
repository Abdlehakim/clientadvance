import type { Request, Response } from "express";
import { getCurrentUser, login, logout } from "./auth.service.js";

export async function loginController(req: Request, res: Response) {
  const result = await login(req.body.email, req.body.password);
  res.json(result);
}

export async function meController(req: Request, res: Response) {
  const user = await getCurrentUser(req.user!.id);
  res.json(user);
}

export async function logoutController(_req: Request, res: Response) {
  const result = await logout();
  res.json(result);
}
