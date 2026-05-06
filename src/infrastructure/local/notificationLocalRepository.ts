import type { NotificationRepository } from "@/domain/repositories";
import type { NotificationItem } from "@/domain/types";
import { KEYS, read, uid, write } from "./localStorageDatabase";

const list = () => read<NotificationItem[]>(KEYS.notifications, []);

export const notificationLocalRepository: NotificationRepository = {
  getAll() { return list(); },
  create(input) {
    const n: NotificationItem = { ...input, id: uid(), created_at: new Date().toISOString(), status: "queued" };
    write(KEYS.notifications, [n, ...list()]);
    return n;
  },
  markAsSent(id) {
    write(KEYS.notifications, list().map((n) => n.id === id ? { ...n, status: "sent" } : n));
  },
  markAsFailed(id) {
    write(KEYS.notifications, list().map((n) => n.id === id ? { ...n, status: "failed" } : n));
  },
};
