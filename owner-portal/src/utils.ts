import type {
  LicenseAdminStatus,
  OwnerNotificationDeliveryMode,
  OwnerCompanyStatus,
  OwnerServerMode,
  OwnerLicenseActivation,
} from "./types";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateTimeFormatter.format(date);
}

export function isoToLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function localInputToIso(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export async function copyToClipboard(value: string) {
  await navigator.clipboard.writeText(value);
}

export function getCompanyStatusLabel(status: OwnerCompanyStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "suspended") {
    return "Suspendue";
  }

  return "Archivée";
}

export function getCompanyStatusTone(status: OwnerCompanyStatus) {
  if (status === "active") {
    return "badge--success";
  }

  if (status === "suspended") {
    return "badge--warning";
  }

  return "badge--danger";
}

export function getServerModeLabel(mode: OwnerServerMode) {
  return mode === "with-server" ? "Avec serveur" : "Sans serveur";
}

export function getNotificationDeliveryModeForServerMode(
  mode: OwnerServerMode,
): OwnerNotificationDeliveryMode {
  return mode === "with-server" ? "backend" : "desktop-email";
}

export function getNotificationDeliveryModeLabel(
  mode: OwnerNotificationDeliveryMode,
) {
  return mode === "backend"
    ? "Serveur backend"
    : "Email direct depuis l'application";
}

export function getLicenseStatusLabel(status: LicenseAdminStatus) {
  if (status === "active") {
    return "Active";
  }

  if (status === "suspended") {
    return "Suspendue";
  }

  if (status === "revoked") {
    return "Révoquée";
  }

  return "Expirée";
}

export function getLicenseStatusTone(status: LicenseAdminStatus) {
  if (status === "active") {
    return "badge--success";
  }

  if (status === "suspended") {
    return "badge--warning";
  }

  return "badge--danger";
}

export function getAdminStatusLabel(isActive: boolean) {
  return isActive ? "Actif" : "Désactivé";
}

export function getAdminStatusTone(isActive: boolean) {
  return isActive ? "badge--success" : "badge--danger";
}

export function getActivationStatusLabel(
  activation: Pick<OwnerLicenseActivation, "deactivated_at" | "revoked_at">,
) {
  if (activation.deactivated_at) {
    return "Désactivé";
  }

  if (activation.revoked_at) {
    return "Révoqué";
  }

  return "Actif";
}

export function getActivationStatusTone(
  activation: Pick<OwnerLicenseActivation, "deactivated_at" | "revoked_at">,
) {
  if (activation.deactivated_at || activation.revoked_at) {
    return "badge--danger";
  }

  return "badge--success";
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const cryptoApi = typeof window !== "undefined" ? window.crypto : null;
  const buffer = new Uint8Array(12);

  if (cryptoApi) {
    cryptoApi.getRandomValues(buffer);
  } else {
    for (let index = 0; index < buffer.length; index += 1) {
      buffer[index] = Math.floor(Math.random() * alphabet.length);
    }
  }

  let password = "";

  for (const value of buffer) {
    password += alphabet[value % alphabet.length];
  }

  return `${password.slice(0, 4)}-${password.slice(4, 8)}-${password.slice(8, 12)}`;
}
