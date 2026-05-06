import type { Request, Response } from "express";
import { createPayment, getPaymentsByClientId, listPayments } from "./payments.service.js";

export async function getPaymentsController(_req: Request, res: Response) {
  const payments = await listPayments();
  res.json(payments);
}

export async function getPaymentsByClientController(req: Request, res: Response) {
  const payments = await getPaymentsByClientId(req.params.clientId);
  res.json(payments);
}

export async function createPaymentController(req: Request, res: Response) {
  const payment = await createPayment(req.body, req.user!);
  res.status(201).json(payment);
}
