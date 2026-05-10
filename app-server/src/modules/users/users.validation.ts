import { z } from "zod";

export const userParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire"),
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  role: z.literal("employe").default("employe"),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Le nom est obligatoire").optional(),
    password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined || value.password !== undefined || value.is_active !== undefined,
    {
      message: "Aucune modification fournie",
    },
  );
