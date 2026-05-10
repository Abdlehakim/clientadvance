import {
  getStoredOwnerAdminKey,
  listOwnerLicenses,
  storeOwnerAdminKey,
} from "./ownerLicenseAdminService";

function normalizeOwnerAdminKey(value: string) {
  return value.trim();
}

export function getStoredOwnerSession() {
  return normalizeOwnerAdminKey(getStoredOwnerAdminKey());
}

export function clearOwnerSession() {
  storeOwnerAdminKey("");
}

export async function verifyOwnerSession(ownerAdminKey: string) {
  const normalizedKey = normalizeOwnerAdminKey(ownerAdminKey);

  if (!normalizedKey) {
    throw new Error("Clé propriétaire invalide.");
  }

  await listOwnerLicenses(normalizedKey);
  return normalizedKey;
}

export async function signInOwnerSession(ownerAdminKey: string) {
  const normalizedKey = await verifyOwnerSession(ownerAdminKey);
  storeOwnerAdminKey(normalizedKey);
  return normalizedKey;
}
