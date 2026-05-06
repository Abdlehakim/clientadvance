/** SQLite repository for activity logs (Tauri build) — placeholder. */
import type { ActivityLogRepository } from "@/domain/repositories";

export const activityLogSQLiteRepository: ActivityLogRepository = {
  getAll() { throw new Error("TODO: SELECT * FROM activity_logs ORDER BY created_at DESC"); },
  create() { throw new Error("TODO: INSERT INTO activity_logs(...)"); },
};
