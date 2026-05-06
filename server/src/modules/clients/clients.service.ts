import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";
import { HttpError } from "../../utils/httpError.js";
import { createActivityLog } from "../activityLogs/activityLogs.service.js";

interface ClientInput {
  id?: string;
  nom_complet: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  cin?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  remote_updated_at?: string;
}

interface ClientUpdateInput extends Partial<ClientInput> {
  nom_complet?: string;
}

function serialize(client: {
  id: string;
  nomComplet: string;
  telephone: string | null;
  adresse: string | null;
  email: string | null;
  cin: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  remoteUpdatedAt: Date;
}) {
  return {
    id: client.id,
    nom_complet: client.nomComplet,
    telephone: client.telephone ?? "",
    adresse: client.adresse ?? "",
    email: client.email ?? "",
    cin: client.cin ?? "",
    created_at: client.createdAt.toISOString(),
    updated_at: client.updatedAt.toISOString(),
    created_by: client.createdBy ?? "",
    updated_by: client.updatedBy ?? "",
    deleted_at: client.deletedAt?.toISOString() ?? null,
    remote_updated_at: client.remoteUpdatedAt.toISOString(),
    pending_sync: false,
    sync_status: "synced" as const,
  };
}

export async function listClients() {
  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });

  return clients.map(serialize);
}

export async function getClientById(id: string) {
  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
  });

  if (!client) {
    throw new HttpError(404, "Client introuvable");
  }

  return serialize(client);
}

export async function createClient(input: ClientInput, actor: { id: string; name: string }) {
  const now = new Date();
  const client = await prisma.client.create({
    data: {
      id: input.id ?? createId("client"),
      nomComplet: input.nom_complet,
      telephone: input.telephone || null,
      adresse: input.adresse || null,
      email: input.email || null,
      cin: input.cin || null,
      createdAt: input.created_at ? new Date(input.created_at) : now,
      updatedAt: input.updated_at ? new Date(input.updated_at) : now,
      createdBy: input.created_by ?? actor.id,
      updatedBy: input.updated_by ?? actor.id,
      remoteUpdatedAt: input.remote_updated_at ? new Date(input.remote_updated_at) : now,
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "client_create",
    description: `Création du client ${client.nomComplet}`,
    entityType: "client",
    entityId: client.id,
  });

  return serialize(client);
}

export async function updateClient(id: string, patch: ClientUpdateInput, actor: { id: string; name: string }) {
  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing || existing.deletedAt) {
    throw new HttpError(404, "Client introuvable");
  }

  const updated = await prisma.client.update({
    where: { id },
    data: {
      nomComplet: patch.nom_complet ?? existing.nomComplet,
      telephone: patch.telephone !== undefined ? patch.telephone || null : existing.telephone,
      adresse: patch.adresse !== undefined ? patch.adresse || null : existing.adresse,
      email: patch.email !== undefined ? patch.email || null : existing.email,
      cin: patch.cin !== undefined ? patch.cin || null : existing.cin,
      updatedAt: patch.updated_at ? new Date(patch.updated_at) : new Date(),
      updatedBy: patch.updated_by ?? actor.id,
      remoteUpdatedAt: patch.remote_updated_at ? new Date(patch.remote_updated_at) : new Date(),
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "client_update",
    description: `Modification du client ${updated.nomComplet}`,
    entityType: "client",
    entityId: updated.id,
  });

  return serialize(updated);
}

export async function deleteClient(id: string, actor: { id: string; name: string }) {
  const existing = await prisma.client.findUnique({ where: { id } });

  if (!existing || existing.deletedAt) {
    throw new HttpError(404, "Client introuvable");
  }

  const deleted = await prisma.client.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: actor.id,
      remoteUpdatedAt: new Date(),
    },
  });

  await createActivityLog({
    userId: actor.id,
    userName: actor.name,
    actionType: "client_delete",
    description: `Suppression du client ${deleted.nomComplet}`,
    entityType: "client",
    entityId: deleted.id,
  });

  return { success: true };
}
