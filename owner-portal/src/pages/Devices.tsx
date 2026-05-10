import { useEffect, useState } from "react";
import { PageShell } from "../components/PageShell";
import { useOwnerPortal } from "../components/OwnerPortalProvider";
import {
  deactivateOwnerLicenseDevice,
  listOwnerActivatedDevices,
} from "../services/ownerLicenseAdminService";
import type { OwnerActivatedDeviceSummary } from "../types";
import {
  formatDateTime,
  getLicenseStatusLabel,
  getLicenseStatusTone,
} from "../utils";

function getDeviceStatusLabel(device: OwnerActivatedDeviceSummary) {
  if (device.deactivated_at) {
    return "Désactivé";
  }

  if (device.revoked_at) {
    return "Révoqué";
  }

  return "Actif";
}

function getDeviceStatusTone(device: OwnerActivatedDeviceSummary) {
  if (device.deactivated_at || device.revoked_at) {
    return "badge--danger";
  }

  return "badge--success";
}

export default function DevicesPage() {
  const { ownerAdminKey } = useOwnerPortal();
  const [devices, setDevices] = useState<OwnerActivatedDeviceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!ownerAdminKey) {
      setDevices([]);
      setMessage(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setMessage(null);

    void listOwnerActivatedDevices(ownerAdminKey)
      .then((nextDevices) => {
        if (active) {
          setDevices(nextDevices);
        }
      })
      .catch((error) => {
        if (active) {
          setMessage({
            type: "error",
            text:
              error instanceof Error ? error.message : "Chargement impossible.",
          });
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [ownerAdminKey]);

  const refreshDevices = async () => {
    if (!ownerAdminKey) {
      return;
    }

    const nextDevices = await listOwnerActivatedDevices(ownerAdminKey);
    setDevices(nextDevices);
  };

  const handleDeactivateDevice = async (device: OwnerActivatedDeviceSummary) => {
    if (!ownerAdminKey) {
      return;
    }

    if (device.deactivated_at || device.revoked_at) {
      return;
    }

    if (!window.confirm("Désactiver cet appareil ?")) {
      return;
    }

    try {
      await deactivateOwnerLicenseDevice(ownerAdminKey, device.license_id, device.id);
      await refreshDevices();
      setMessage({ type: "success", text: "Appareil désactivé." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Désactivation impossible.",
      });
    }
  };

  return (
    <PageShell
      title="Appareils"
      description="Surveillez chaque appareil lié à une licence commerciale et désactivez-le à distance si nécessaire."
    >
      <div className="card">
        <div className="section-header">
          <div>
            <h2>Appareils</h2>
            <p className="muted">{devices.length} activation(s) remontée(s)</p>
          </div>
          {isLoading ? (
            <span className="badge badge--neutral">Chargement...</span>
          ) : null}
        </div>

        {message ? (
          <div
            className={`message ${
              message.type === "error"
                ? "message--error"
                : "message--success"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Entreprise</th>
                <th>Device</th>
                <th>Statut appareil</th>
                <th>Statut licence</th>
                <th>Version app</th>
                <th>Activé le</th>
                <th>Dernière vérification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.company_name ?? "-"}</td>
                  <td>
                    <div className="mono">{device.device_id_short}</div>
                    <div className="muted">{device.device_id}</div>
                  </td>
                  <td>
                    <span className={`badge ${getDeviceStatusTone(device)}`}>
                      {getDeviceStatusLabel(device)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${getLicenseStatusTone(device.license_status)}`}
                    >
                      {getLicenseStatusLabel(device.license_status)}
                    </span>
                  </td>
                  <td>{device.app_version ?? "-"}</td>
                  <td>{formatDateTime(device.activated_at)}</td>
                  <td>{formatDateTime(device.last_checked_at)}</td>
                  <td>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() => void handleDeactivateDevice(device)}
                      disabled={Boolean(device.deactivated_at || device.revoked_at)}
                    >
                      Désactiver cet appareil
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && devices.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">Aucun appareil activé.</div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
