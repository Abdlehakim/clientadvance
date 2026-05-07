import type { NotificationRepository } from "@/domain/repositories";
import type { NotificationItem } from "@/domain/types";
import { KEYS, read, uid, write } from "./localStorageDatabase";

const list = () => read<NotificationItem[]>(KEYS.notifications, []);

export const notificationLocalRepository: NotificationRepository = {
  getAll() {
    return list();
  },
  create(input) {
    const notification: NotificationItem = {
      ...input,
      id: uid(),
      created_at: new Date().toISOString(),
      status: "queued",
      error_message: null,
      sent_at: null,
      pending_sync: true,
      sync_status: "pending",
    };

    write(KEYS.notifications, [notification, ...list()]);
    return notification;
  },
  markAsSent(id) {
    write(
      KEYS.notifications,
      list().map((notification) =>
        notification.id === id
          ? {
              ...notification,
              status: "sent",
              error_message: null,
              sent_at: new Date().toISOString(),
              pending_sync: true,
              sync_status: "pending" as const,
            }
          : notification,
      ),
    );
  },
  markAsFailed(id, errorMessage) {
    write(
      KEYS.notifications,
      list().map((notification) =>
        notification.id === id
          ? {
              ...notification,
              status: "failed",
              error_message: errorMessage ?? notification.error_message ?? "Notification en échec.",
              sent_at: new Date().toISOString(),
              pending_sync: true,
              sync_status: "pending" as const,
            }
          : notification,
      ),
    );
  },
};
