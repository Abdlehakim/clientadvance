import { z } from "zod";

export const updateAdminSettingsSchema = z.object({
  id: z.string().min(1).optional(),
  admin_email: z.string().trim().email().optional().or(z.literal("")),
  admin_whatsapp: z.string().trim().optional().or(z.literal("")),
  updated_at: z.string().datetime().optional(),
  updated_by: z.string().min(1).optional(),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: z.enum(["local", "pending", "synced", "failed"]).optional(),
});
