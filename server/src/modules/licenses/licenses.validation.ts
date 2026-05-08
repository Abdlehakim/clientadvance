import { z } from "zod";

export const activateLicenseSchema = z
  .object({
    license_key: z.string().trim().min(1, "La clé de licence est obligatoire.").optional(),
    licenseKey: z.string().trim().min(1, "La clé de licence est obligatoire.").optional(),
    customer_name: z.string().trim().min(1).max(200).optional(),
    customerName: z.string().trim().min(1).max(200).optional(),
    app_version: z.string().trim().min(1).max(50).optional(),
    appVersion: z.string().trim().min(1).max(50).optional(),
  })
  .transform((value) => ({
    license_key: value.license_key ?? value.licenseKey ?? "",
    customer_name: value.customer_name ?? value.customerName,
    app_version: value.app_version ?? value.appVersion,
  }))
  .refine((value) => value.license_key.trim().length > 0, {
    message: "La clé de licence est obligatoire.",
    path: ["license_key"],
  });
