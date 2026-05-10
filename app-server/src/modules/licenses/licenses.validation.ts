import { z } from "zod";

function normalizeLicenseRequestShape<
  TValue extends {
    license_key?: string;
    licenseKey?: string;
    device_id?: string;
    deviceId?: string;
    customer_name?: string;
    customerName?: string;
    app_version?: string;
    appVersion?: string;
  },
>(value: TValue) {
  return {
    license_key: value.license_key ?? value.licenseKey ?? "",
    device_id: value.device_id ?? value.deviceId ?? "",
    customer_name: value.customer_name ?? value.customerName,
    app_version: value.app_version ?? value.appVersion,
  };
}

const baseLicenseRequestSchema = z.object({
  license_key: z.string().trim().min(1, "La clé de licence est obligatoire.").optional(),
  licenseKey: z.string().trim().min(1, "La clé de licence est obligatoire.").optional(),
  device_id: z
    .string()
    .trim()
    .min(1, "L'identifiant appareil est obligatoire.")
    .max(255)
    .optional(),
  deviceId: z
    .string()
    .trim()
    .min(1, "L'identifiant appareil est obligatoire.")
    .max(255)
    .optional(),
  customer_name: z.string().trim().min(1).max(200).optional(),
  customerName: z.string().trim().min(1).max(200).optional(),
  app_version: z.string().trim().min(1).max(50).optional(),
  appVersion: z.string().trim().min(1).max(50).optional(),
});

export const activateLicenseSchema = baseLicenseRequestSchema
  .transform((value) => normalizeLicenseRequestShape(value))
  .refine((value) => value.license_key.trim().length > 0, {
    message: "La clé de licence est obligatoire.",
    path: ["license_key"],
  })
  .refine((value) => value.device_id.trim().length > 0, {
    message: "L'identifiant appareil est obligatoire.",
    path: ["device_id"],
  });

export const checkLicenseSchema = z
  .object({
    license_token: z.string().trim().min(1, "Le jeton de licence est obligatoire.").optional(),
    licenseToken: z.string().trim().min(1, "Le jeton de licence est obligatoire.").optional(),
    device_id: z
      .string()
      .trim()
      .min(1, "L'identifiant appareil est obligatoire.")
      .max(255)
      .optional(),
    deviceId: z
      .string()
      .trim()
      .min(1, "L'identifiant appareil est obligatoire.")
      .max(255)
      .optional(),
    app_version: z.string().trim().min(1).max(50).optional(),
    appVersion: z.string().trim().min(1).max(50).optional(),
  })
  .transform((value) => ({
    license_token: value.license_token ?? value.licenseToken ?? "",
    device_id: value.device_id ?? value.deviceId ?? "",
    app_version: value.app_version ?? value.appVersion,
  }))
  .refine((value) => value.license_token.trim().length > 0, {
    message: "Le jeton de licence est obligatoire.",
    path: ["license_token"],
  })
  .refine((value) => value.device_id.trim().length > 0, {
    message: "L'identifiant appareil est obligatoire.",
    path: ["device_id"],
  });
