import { z } from "zod";

const syncStatusSchema = z.enum(["local", "pending", "synced", "failed"]);

const clientSyncSchema = z.object({
  id: z.string().min(1),
  nom_complet: z.string().trim().min(1),
  telephone: z.string().optional().default(""),
  adresse: z.string().optional().default(""),
  email: z.string().email().optional().or(z.literal("")),
  cin: z.string().regex(/^\d+$/, "CIN must be numeric").optional().or(z.literal("")),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().optional().default(""),
  updated_by: z.string().optional().default(""),
  deleted_at: z.string().datetime().nullable().optional(),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: syncStatusSchema.optional(),
});

const paymentSyncSchema = z.object({
  id: z.string().min(1),
  client_id: z.string().min(1),
  montant: z.number().positive(),
  date_paiement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure_paiement: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  created_by: z.string().optional().default(""),
  created_at: z.string().datetime(),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: syncStatusSchema.optional(),
});

const adminSettingsSyncSchema = z.object({
  id: z.string().min(1).default("settings_default"),
  admin_email: z.string().email().optional().or(z.literal("")),
  admin_whatsapp: z.string().optional().default(""),
  updated_at: z.string().datetime(),
  updated_by: z.string().optional().default(""),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: syncStatusSchema.optional(),
});

const activityLogSyncSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().optional().default(""),
  user_name: z.string().trim().min(1),
  action_type: z.string().trim().min(1),
  description: z.string().trim().min(1),
  entity_type: z.string().optional().default(""),
  entity_id: z.string().optional().default(""),
  created_at: z.string().datetime(),
});

const notificationSyncSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["email", "whatsapp"]),
  recipient: z.string().trim().min(1),
  subject: z.string().optional().default(""),
  body: z.string().trim().min(1),
  payment_id: z.string().optional().default(""),
  status: z.enum(["pending", "sent", "failed"]),
  error_message: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  sent_at: z.string().datetime().nullable().optional(),
});

export const syncPushSchema = z.object({
  clients: z.array(clientSyncSchema).default([]),
  payments: z.array(paymentSyncSchema).default([]),
  adminSettings: adminSettingsSyncSchema.nullable().default(null),
  activityLogs: z.array(activityLogSyncSchema).default([]),
  notifications: z.array(notificationSyncSchema).default([]),
});

export const syncPullQuerySchema = z.object({
  since: z.string().datetime().optional(),
});

export const syncFullSchema = syncPushSchema.extend({
  since: z.string().datetime().optional(),
});
