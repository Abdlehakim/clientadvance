export type NotificationChannel = "email" | "whatsapp";
export type NotificationStatus = "queued" | "sent" | "failed";

export interface NotificationItem {
  id: string;
  type: NotificationChannel;
  recipient: string;
  subject: string;
  body: string;
  created_at: string;
  payment_id: string;
  status?: NotificationStatus;
}

export type NotificationCreateInput = Omit<NotificationItem, "id" | "created_at" | "status">;
