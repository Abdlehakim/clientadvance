import { useEffect, useState } from "react";
import { getAdminSettings } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { AdminSettings } from "../types";

function renderMode(value: string) {
  if (value === "with-server") {
    return "Avec serveur";
  }

  if (value === "backend") {
    return "Serveur";
  }

  return "Desktop";
}

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(user?.role === "admin");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (user?.role !== "admin") {
      return;
    }

    async function loadSettings() {
      try {
        const nextSettings = await getAdminSettings();
        if (isMounted) {
          setSettings(nextSettings);
          setError("");
        }
      } catch {
        if (isMounted) {
          setError("Parametres indisponibles");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Mode en ligne</p>
          <h1>Parametres</h1>
        </div>
      </div>

      {user?.role !== "admin" ? (
        <div className="notice">Acces reserve aux administrateurs.</div>
      ) : null}

      {error ? <div className="notice error">{error}</div> : null}

      {user?.role === "admin" ? (
        <section className="settings-grid">
          <article className="detail-card">
            <span>Email admin</span>
            <strong>
              {isLoading ? "..." : settings?.admin_email || "Non renseigne"}
            </strong>
          </article>
          <article className="detail-card">
            <span>WhatsApp admin</span>
            <strong>
              {isLoading ? "..." : settings?.admin_whatsapp || "Non renseigne"}
            </strong>
          </article>
          <article className="detail-card">
            <span>Mode serveur</span>
            <strong>
              {isLoading ? "..." : renderMode(settings?.server_mode ?? "")}
            </strong>
          </article>
          <article className="detail-card">
            <span>Notifications</span>
            <strong>
              {isLoading
                ? "..."
                : renderMode(settings?.notification_delivery_mode ?? "")}
            </strong>
          </article>
        </section>
      ) : null}
    </section>
  );
}
