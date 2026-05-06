import { z } from "zod";

export const createActivityLogSchema = z.object({
  user_id: z.string().optional(),
  user_name: z.string().trim().min(1),
  action_type: z.string().trim().min(1),
  description: z.string().trim().min(1),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  created_at: z.string().datetime().optional(),
});
