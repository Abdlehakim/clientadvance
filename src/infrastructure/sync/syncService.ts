/**
 * SyncService — orchestrates the offline-first synchronization.
 *
 * Real flow (target):
 *   1. Read pending rows from the LOCAL repository (SQLite in production).
 *   2. POST them to /sync/push on the remote API.
 *   3. On success: mark each row pending_sync=false, sync_status='synced'.
 *   4. On error : mark them sync_status='failed' (kept locally, retried later).
 *   5. GET /sync/pull to receive remote updates and upsert them locally.
 *   6. Persist a `lastSync` timestamp.
 *   7. Append an activity log entry.
 *
 * For the browser preview we delegate to the localStorage-only simulation
 * (`localSyncService`) so the UI keeps working unchanged.
 */
import type { SyncRepository } from "@/domain/repositories";
import { localSyncService } from "./localSyncService";

export const syncService: SyncRepository = localSyncService;
