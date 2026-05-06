import type { Request, Response } from "express";
import { createClient, deleteClient, getClientById, listClients, updateClient } from "./clients.service.js";

export async function getClientsController(_req: Request, res: Response) {
  const clients = await listClients();
  res.json(clients);
}

export async function getClientByIdController(req: Request, res: Response) {
  const client = await getClientById(req.params.id);
  res.json(client);
}

export async function createClientController(req: Request, res: Response) {
  const client = await createClient(req.body, req.user!);
  res.status(201).json(client);
}

export async function updateClientController(req: Request, res: Response) {
  const client = await updateClient(req.params.id, req.body, req.user!);
  res.json(client);
}

export async function deleteClientController(req: Request, res: Response) {
  const result = await deleteClient(req.params.id, req.user!);
  res.json(result);
}
