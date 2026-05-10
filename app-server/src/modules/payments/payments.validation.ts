import { z } from "zod";

export const paymentParamsSchema = z.object({
  clientId: z.string().min(1),
});

export const createPaymentSchema = z.object({
  id: z.string().min(1).optional(),
  client_id: z.string().min(1),
  montant: z.number().positive(),
  date_paiement: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  heure_paiement: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  created_by: z.string().min(1).optional(),
  created_at: z.string().datetime().optional(),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: z.enum(["local", "pending", "synced", "failed"]).optional(),
});
