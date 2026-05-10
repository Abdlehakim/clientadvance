import { prisma } from "../../config/prisma.js";
import { createId } from "../../utils/ids.js";

interface CreateActivityLogInput {
  id?: string;
  userId?: string | null;
  userName: string;
  actionType: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt?: string;
}

function serialize(log: {
  id: string;
  userId: string | null;
  userName: string;
  actionType: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
}) {
  return {
    id: log.id,
    user_id: log.userId ?? "",
    user_name: log.userName,
    action_type: log.actionType,
    description: log.description,
    entity_type: log.entityType ?? "",
    entity_id: log.entityId ?? "",
    created_at: log.createdAt.toISOString(),
  };
}

export async function listActivityLogs() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
  });

  return logs.map(serialize);
}

export async function createActivityLog(input: CreateActivityLogInput) {
  const log = await prisma.activityLog.create({
    data: {
      id: input.id ?? createId("log"),
      userId: input.userId ?? null,
      userName: input.userName,
      actionType: input.actionType,
      description: input.description,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
    },
  });

  return serialize(log);
}
