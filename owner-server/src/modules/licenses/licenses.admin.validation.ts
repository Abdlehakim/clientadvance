import { z } from "zod";

const licenseStatusSchema = z.enum(["active", "expired", "revoked", "suspended"]);

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

export const adminLicenseIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Identifiant licence invalide."),
});

export const adminLicenseActivationParamsSchema = z.object({
  id: z.string().trim().min(1, "Identifiant licence invalide."),
  activationId: z.string().trim().min(1, "Identifiant activation invalide."),
});

export const createAdminLicenseSchema = z
  .object({
    company_id: z.string().trim().min(1).nullable().optional(),
    companyId: z.string().trim().min(1).nullable().optional(),
    customer_name: z.string().trim().max(200).nullable().optional(),
    customerName: z.string().trim().max(200).nullable().optional(),
    expires_at: z.string().trim().max(50).nullable().optional(),
    expiresAt: z.string().trim().max(50).nullable().optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    max_devices: z.coerce.number().int().positive().max(1000).optional(),
    maxDevices: z.coerce.number().int().positive().max(1000).optional(),
  })
  .transform((value) => ({
    company_id: normalizeNullableText(value.company_id ?? value.companyId),
    customer_name: normalizeNullableText(value.customer_name ?? value.customerName),
    expires_at: normalizeNullableText(value.expires_at ?? value.expiresAt),
    note: normalizeNullableText(value.note),
    max_devices: value.max_devices ?? value.maxDevices ?? 1,
  }));

export const updateAdminLicenseSchema = z
  .object({
    customer_name: z.string().trim().max(200).nullable().optional(),
    customerName: z.string().trim().max(200).nullable().optional(),
    expires_at: z.string().trim().max(50).nullable().optional(),
    expiresAt: z.string().trim().max(50).nullable().optional(),
    status: licenseStatusSchema.optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    max_devices: z.coerce.number().int().positive().max(1000).optional(),
    maxDevices: z.coerce.number().int().positive().max(1000).optional(),
  })
  .transform((value) => ({
    customer_name:
      value.customer_name !== undefined || value.customerName !== undefined
        ? normalizeNullableText(value.customer_name ?? value.customerName)
        : undefined,
    expires_at:
      value.expires_at !== undefined || value.expiresAt !== undefined
        ? normalizeNullableText(value.expires_at ?? value.expiresAt)
        : undefined,
    status: value.status,
    note:
      value.note !== undefined
        ? normalizeNullableText(value.note)
        : undefined,
    max_devices: value.max_devices ?? value.maxDevices,
  }));
