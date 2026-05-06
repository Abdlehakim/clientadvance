import type { ClientRepository } from "@/domain/repositories";
import type { Client } from "@/domain/types";
import { KEYS, read, uid, write } from "./localStorageDatabase";
import { authLocalRepository } from "./authLocalRepository";
import { activityLogLocalRepository } from "./activityLogLocalRepository";

const list = () => read<Client[]>(KEYS.clients, []);

export const clientLocalRepository: ClientRepository = {
  getAll() { return list(); },
  getById(id) { return list().find((c) => c.id === id) ?? null; },
  create(input) {
    const u = authLocalRepository.getCurrentUser();
    const now = new Date().toISOString();
    const c: Client = {
      ...input, id: uid(), created_at: now, updated_at: now,
      created_by: u?.name ?? "—", updated_by: u?.name ?? "—",
      pending_sync: true, sync_status: "pending",
    };
    write(KEYS.clients, [c, ...list()]);
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "client_create", description: `Création du client ${c.nom_complet}`,
      entity_type: "client", entity_id: c.id,
    });
    return c;
  },
  update(id, patch) {
    const u = authLocalRepository.getCurrentUser();
    const next = list().map((c) => c.id === id ? {
      ...c, ...patch, updated_at: new Date().toISOString(),
      updated_by: u?.name ?? c.updated_by,
      pending_sync: true, sync_status: "pending" as const,
    } : c);
    write(KEYS.clients, next);
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "client_update",
      description: `Modification du client ${patch.nom_complet ?? id}`,
      entity_type: "client", entity_id: id,
    });
  },
  delete(id) {
    const u = authLocalRepository.getCurrentUser();
    const c = list().find((x) => x.id === id);
    write(KEYS.clients, list().filter((x) => x.id !== id));
    activityLogLocalRepository.create({
      user_id: u?.id ?? "", user_name: u?.name ?? "—",
      action_type: "client_delete",
      description: `Suppression du client ${c?.nom_complet ?? id}`,
      entity_type: "client", entity_id: id,
    });
  },
};
