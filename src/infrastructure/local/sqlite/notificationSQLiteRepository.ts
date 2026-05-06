/** SQLite repository for the notification queue (Tauri build) — placeholder. */
import type { NotificationRepository } from "@/domain/repositories";

export const notificationSQLiteRepository: NotificationRepository = {
  getAll() { throw new Error("TODO: SELECT * FROM notification_queue"); },
  create() { throw new Error("TODO: INSERT INTO notification_queue(...) status='queued'"); },
  markAsSent() { throw new Error("TODO: UPDATE notification_queue SET status='sent' WHERE id=?"); },
  markAsFailed() { throw new Error("TODO: UPDATE notification_queue SET status='failed' WHERE id=?"); },
};
