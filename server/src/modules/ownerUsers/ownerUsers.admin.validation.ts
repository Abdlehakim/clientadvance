import { z } from "zod";

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export const ownerAdminCompanyIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Identifiant entreprise invalide."),
});

export const ownerAdminUserIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Identifiant administrateur invalide."),
});

export const createOwnerAdminUserSchema = z
  .object({
    admin_name: z.string().trim().min(1).max(200).optional(),
    adminName: z.string().trim().min(1).max(200).optional(),
    admin_email: z.string().trim().email().optional(),
    adminEmail: z.string().trim().email().optional(),
    admin_password: z.string().min(6).max(200).optional(),
    adminPassword: z.string().min(6).max(200).optional(),
    force_password_change: z.boolean().optional(),
    forcePasswordChange: z.boolean().optional(),
  })
  .transform((value) => ({
    admin_name: value.admin_name ?? value.adminName ?? "",
    admin_email: value.admin_email ?? value.adminEmail ?? "",
    admin_password: value.admin_password ?? value.adminPassword,
    force_password_change:
      value.force_password_change ?? value.forcePasswordChange ?? false,
  }))
  .refine((value) => value.admin_name.trim().length > 0, {
    message: "Le nom de l'administrateur est obligatoire.",
    path: ["admin_name"],
  })
  .refine((value) => value.admin_email.trim().length > 0, {
    message: "L'email administrateur est obligatoire.",
    path: ["admin_email"],
  });

export const updateOwnerAdminUserSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().optional(),
    force_password_change: z.boolean().optional(),
    forcePasswordChange: z.boolean().optional(),
  })
  .transform((value) => ({
    name: value.name?.trim(),
    email: value.email?.trim().toLowerCase(),
    force_password_change:
      value.force_password_change ?? value.forcePasswordChange,
  }))
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.force_password_change !== undefined,
    {
      message: "Aucune modification fournie.",
    },
  );

export const resetOwnerAdminPasswordSchema = z
  .object({
    password: z.string().min(6).max(200).optional(),
    admin_password: z.string().min(6).max(200).optional(),
    adminPassword: z.string().min(6).max(200).optional(),
    force_password_change: z.boolean().optional(),
    forcePasswordChange: z.boolean().optional(),
  })
  .transform((value) => ({
    password: normalizeNullableText(
      value.password ?? value.admin_password ?? value.adminPassword,
    ),
    force_password_change:
      value.force_password_change ?? value.forcePasswordChange ?? true,
  }));
