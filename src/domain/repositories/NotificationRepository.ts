import type { NotificationCreateInput, NotificationItem } from "@/domain/types";

export interface NotificationRepository {
  getAll(): NotificationItem[] | Promise<NotificationItem[]>;
  create(input: NotificationCreateInput): NotificationItem | Promise<NotificationItem>;
  markAsSent(id: string): void | Promise<void>;
  markAsFailed(id: string, errorMessage?: string): void | Promise<void>;
}
