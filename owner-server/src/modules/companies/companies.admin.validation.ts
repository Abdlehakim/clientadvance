import { z } from "zod";

const companyStatusSchema = z.enum(["active", "suspended", "archived"]);
const serverModeSchema = z.enum(["with-server", "without-server"]);
const notificationDeliveryModeSchema = z.enum(["backend", "desktop-email"]);

function getNotificationDeliveryModeForServerMode(
  serverMode: z.infer<typeof serverModeSchema>,
) {
  return serverMode === "with-server" ? "backend" : "desktop-email";
}

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

export const adminCompanyIdParamsSchema = z.object({
  id: z.string().trim().min(1, "Identifiant entreprise invalide."),
});

export const createAdminCompanySchema = z
  .object({
    company_name: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
    contact_email: z.string().trim().email().optional(),
    contactEmail: z.string().trim().email().optional(),
    contact_phone: z.string().trim().max(50).nullable().optional(),
    contactPhone: z.string().trim().max(50).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: companyStatusSchema.optional(),
    server_mode: serverModeSchema.optional(),
    serverMode: serverModeSchema.optional(),
    notification_delivery_mode: notificationDeliveryModeSchema.optional(),
    notificationDeliveryMode: notificationDeliveryModeSchema.optional(),
  })
  .transform((value) => {
    const serverMode = value.server_mode ?? value.serverMode ?? "without-server";

    return {
      company_name: value.company_name ?? value.companyName ?? "",
      contact_email: value.contact_email ?? value.contactEmail ?? "",
      contact_phone: normalizeNullableText(value.contact_phone ?? value.contactPhone),
      notes: normalizeNullableText(value.notes),
      status: value.status ?? "active",
      server_mode: serverMode,
      notification_delivery_mode: getNotificationDeliveryModeForServerMode(serverMode),
    };
  })
  .refine((value) => value.company_name.trim().length > 0, {
    message: "Le nom de l'entreprise est obligatoire.",
    path: ["company_name"],
  })
  .refine((value) => value.contact_email.trim().length > 0, {
    message: "L'email de contact est obligatoire.",
    path: ["contact_email"],
  });

export const updateAdminCompanySchema = z
  .object({
    company_name: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
    contact_email: z.string().trim().email().optional(),
    contactEmail: z.string().trim().email().optional(),
    contact_phone: z.string().trim().max(50).nullable().optional(),
    contactPhone: z.string().trim().max(50).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: companyStatusSchema.optional(),
    server_mode: serverModeSchema.optional(),
    serverMode: serverModeSchema.optional(),
    notification_delivery_mode: notificationDeliveryModeSchema.optional(),
    notificationDeliveryMode: notificationDeliveryModeSchema.optional(),
  })
  .transform((value) => ({
    company_name:
      value.company_name !== undefined || value.companyName !== undefined
        ? value.company_name ?? value.companyName ?? ""
        : undefined,
    contact_email:
      value.contact_email !== undefined || value.contactEmail !== undefined
        ? value.contact_email ?? value.contactEmail ?? ""
        : undefined,
    contact_phone:
      value.contact_phone !== undefined || value.contactPhone !== undefined
        ? normalizeNullableText(value.contact_phone ?? value.contactPhone)
        : undefined,
    notes: value.notes !== undefined ? normalizeNullableText(value.notes) : undefined,
    status: value.status,
    server_mode:
      value.server_mode !== undefined || value.serverMode !== undefined
        ? value.server_mode ?? value.serverMode
        : undefined,
    notification_delivery_mode:
      value.notification_delivery_mode !== undefined ||
      value.notificationDeliveryMode !== undefined
        ? value.notification_delivery_mode ?? value.notificationDeliveryMode
        : undefined,
  }))
  .refine(
    (value) =>
      value.company_name !== undefined ||
      value.contact_email !== undefined ||
      value.contact_phone !== undefined ||
      value.notes !== undefined ||
      value.status !== undefined ||
      value.server_mode !== undefined ||
      value.notification_delivery_mode !== undefined,
    {
      message: "Aucune modification fournie.",
    },
  );

export const createAdminCompanyLicenseBundleSchema = z
  .object({
    company_name: z.string().trim().min(1).max(200).optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
    contact_email: z.string().trim().email().optional(),
    contactEmail: z.string().trim().email().optional(),
    contact_phone: z.string().trim().max(50).nullable().optional(),
    contactPhone: z.string().trim().max(50).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    server_mode: serverModeSchema.optional(),
    serverMode: serverModeSchema.optional(),
    notification_delivery_mode: notificationDeliveryModeSchema.optional(),
    notificationDeliveryMode: notificationDeliveryModeSchema.optional(),
    admin_name: z.string().trim().min(1).max(200).optional(),
    adminName: z.string().trim().min(1).max(200).optional(),
    admin_email: z.string().trim().email().optional(),
    adminEmail: z.string().trim().email().optional(),
    admin_password: z.string().min(6).max(200).optional(),
    adminPassword: z.string().min(6).max(200).optional(),
    force_password_change: z.boolean().optional(),
    forcePasswordChange: z.boolean().optional(),
    license_expires_at: z.string().trim().max(50).nullable().optional(),
    licenseExpiresAt: z.string().trim().max(50).nullable().optional(),
    license_note: z.string().trim().max(1000).nullable().optional(),
    licenseNote: z.string().trim().max(1000).nullable().optional(),
    max_devices: z.coerce.number().int().positive().max(1000).optional(),
    maxDevices: z.coerce.number().int().positive().max(1000).optional(),
  })
  .transform((value) => ({
    company_name:
      value.company_name !== undefined || value.companyName !== undefined
        ? value.company_name ?? value.companyName ?? ""
        : undefined,
    contact_email:
      value.contact_email !== undefined || value.contactEmail !== undefined
        ? value.contact_email ?? value.contactEmail ?? ""
        : undefined,
    contact_phone:
      value.contact_phone !== undefined || value.contactPhone !== undefined
        ? normalizeNullableText(value.contact_phone ?? value.contactPhone)
        : undefined,
    notes: value.notes !== undefined ? normalizeNullableText(value.notes) : undefined,
    server_mode:
      value.server_mode !== undefined || value.serverMode !== undefined
        ? value.server_mode ?? value.serverMode
        : undefined,
    notification_delivery_mode:
      value.notification_delivery_mode !== undefined ||
      value.notificationDeliveryMode !== undefined
        ? value.notification_delivery_mode ?? value.notificationDeliveryMode
        : undefined,
    admin_name: value.admin_name ?? value.adminName ?? "",
    admin_email: value.admin_email ?? value.adminEmail ?? "",
    admin_password: value.admin_password ?? value.adminPassword,
    force_password_change:
      value.force_password_change ?? value.forcePasswordChange ?? false,
    license_expires_at: normalizeNullableText(
      value.license_expires_at ?? value.licenseExpiresAt,
    ),
    license_note: normalizeNullableText(value.license_note ?? value.licenseNote),
    max_devices: value.max_devices ?? value.maxDevices ?? 1,
  }))
  .refine((value) => value.admin_name.trim().length > 0, {
    message: "Le nom de l'administrateur est obligatoire.",
    path: ["admin_name"],
  })
  .refine((value) => value.admin_email.trim().length > 0, {
    message: "L'email administrateur est obligatoire.",
    path: ["admin_email"],
  });
