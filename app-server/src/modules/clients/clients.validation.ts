import { z } from "zod";

const optionalTrimmed = z.string().trim().optional().or(z.literal(""));

export const clientParamsSchema = z.object({
  id: z.string().min(1),
});

export const createClientSchema = z.object({
  id: z.string().min(1).optional(),
  nom_complet: z.string().trim().min(1),
  telephone: optionalTrimmed,
  adresse: optionalTrimmed,
  email: z.string().trim().email().optional().or(z.literal("")),
  cin: z
    .string()
    .trim()
    .regex(/^\d+$/, "CIN must be numeric")
    .optional()
    .or(z.literal("")),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  created_by: z.string().min(1).optional(),
  updated_by: z.string().min(1).optional(),
  remote_updated_at: z.string().datetime().optional(),
  pending_sync: z.boolean().optional(),
  sync_status: z.enum(["local", "pending", "synced", "failed"]).optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  nom_complet: z.string().trim().min(1).optional(),
});
