import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { useOwnerPortal } from "../components/OwnerPortalProvider";
import {
  createOwnerCompany,
  createOwnerCompanyAdminLicense,
  listOwnerCompanies,
  listOwnerLicenses,
} from "../services/ownerLicenseAdminService";
import type {
  OwnerCompanyLicenseBundleResponse,
  OwnerCompanySummary,
  OwnerLicenseSummary,
} from "../types";
import {
  copyToClipboard,
  formatDate,
  generateTemporaryPassword,
  getLicenseStatusLabel,
  getLicenseStatusTone,
  localInputToIso,
} from "../utils";

interface BundleFormState {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  forcePasswordChange: boolean;
  expiresAt: string;
  maxDevices: string;
  licenseNote: string;
}

const DASHBOARD_LOAD_ERROR_MESSAGE =
  "Impossible de charger les données propriétaire.";

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function createEmptyBundleForm(): BundleFormState {
  return {
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    forcePasswordChange: false,
    expiresAt: "",
    maxDevices: "1",
    licenseNote: "",
  };
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}</div>
      <p className="stat-card__helper">{helper}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { ownerAdminKey } = useOwnerPortal();
  const didLogLoadErrorRef = useRef(false);
  const [form, setForm] = useState<BundleFormState>(createEmptyBundleForm);
  const [companies, setCompanies] = useState<OwnerCompanySummary[]>([]);
  const [licenses, setLicenses] = useState<OwnerLicenseSummary[]>([]);
  const [creationResult, setCreationResult] =
    useState<OwnerCompanyLicenseBundleResponse | null>(null);
  const [creationCompany, setCreationCompany] =
    useState<OwnerCompanySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitMessage, setSubmitMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!ownerAdminKey) {
      setCompanies([]);
      setLicenses([]);
      setLoadError("");
      return;
    }

    let active = true;
    setIsLoading(true);
    setLoadError("");

    void Promise.all([
      listOwnerCompanies(ownerAdminKey),
      listOwnerLicenses(ownerAdminKey),
    ])
      .then(([nextCompanies, nextLicenses]) => {
        if (!active) {
          return;
        }

        didLogLoadErrorRef.current = false;
        setCompanies(normalizeArray<OwnerCompanySummary>(nextCompanies));
        setLicenses(normalizeArray<OwnerLicenseSummary>(nextLicenses));
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (import.meta.env.DEV && !didLogLoadErrorRef.current) {
          console.error("Owner dashboard load failed.", error);
          didLogLoadErrorRef.current = true;
        }

        setCompanies([]);
        setLicenses([]);
        setLoadError(DASHBOARD_LOAD_ERROR_MESSAGE);
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

  const safeCompanies = normalizeArray<OwnerCompanySummary>(companies);
  const safeLicenses = normalizeArray<OwnerLicenseSummary>(licenses);
  const activeLicenses = safeLicenses.filter((license) => license.status === "active");
  const blockedLicenses = safeLicenses.filter(
    (license) => license.status === "suspended" || license.status === "revoked",
  );
  const activatedDevices = safeLicenses.reduce(
    (total, license) => total + (license.active_device_count ?? 0),
    0,
  );
  const expiringSoon = safeLicenses.filter((license) => {
    if (!license.expires_at || license.status !== "active") {
      return false;
    }

    const diffMs = new Date(license.expires_at).getTime() - Date.now();
    return diffMs >= 0 && diffMs <= 1000 * 60 * 60 * 24 * 30;
  });

  const handleCopy = async (value: string, successText: string) => {
    try {
      await copyToClipboard(value);
      setSubmitMessage({ type: "success", text: successText });
    } catch {
      setSubmitMessage({ type: "error", text: "Copie impossible." });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey) {
      setSubmitMessage({
        type: "error",
        text: "La Clé propriétaire est obligatoire.",
      });
      return;
    }

    setIsSubmitting(true);
    setCreationResult(null);
    setCreationCompany(null);
    setSubmitMessage(null);

    let createdCompany: OwnerCompanySummary | null = null;

    try {
      createdCompany = await createOwnerCompany(ownerAdminKey, {
        company_name: form.companyName,
        contact_email: form.contactEmail,
        contact_phone: form.contactPhone || null,
        notes: form.notes || null,
      });

      const result = await createOwnerCompanyAdminLicense(
        ownerAdminKey,
        createdCompany.id,
        {
          company_name: form.companyName,
          contact_email: form.contactEmail,
          contact_phone: form.contactPhone || null,
          notes: form.notes || null,
          admin_name: form.adminName,
          admin_email: form.adminEmail,
          admin_password: form.adminPassword || undefined,
          force_password_change: form.forcePasswordChange,
          license_expires_at: localInputToIso(form.expiresAt),
          license_note: form.licenseNote || null,
          max_devices: Number.parseInt(form.maxDevices, 10) || 1,
        },
      );

      const [nextCompanies, nextLicenses] = await Promise.all([
        listOwnerCompanies(ownerAdminKey),
        listOwnerLicenses(ownerAdminKey),
      ]);

      setCompanies(normalizeArray<OwnerCompanySummary>(nextCompanies));
      setLicenses(normalizeArray<OwnerLicenseSummary>(nextLicenses));
      setLoadError("");
      setCreationResult(result);
      setCreationCompany(null);
      setForm(createEmptyBundleForm());
      setSubmitMessage({
        type: "success",
        text: "Entreprise, administrateur et licence créés.",
      });
    } catch (error) {
      setCreationCompany(createdCompany);
      setSubmitMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Création entreprise + administrateur + licence impossible.",
      });

      if (createdCompany) {
        try {
          const nextCompanies = await listOwnerCompanies(ownerAdminKey);
          setCompanies(normalizeArray<OwnerCompanySummary>(nextCompanies));
        } catch {
          // Ignore refresh errors after a partial creation.
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      title="Tableau de bord"
      description="Créez les entreprises clientes, les comptes administrateur et les licences depuis un portail web indépendant du client desktop."
    >
      {isLoading && safeCompanies.length === 0 && safeLicenses.length === 0 ? (
        <div className="card">
          <p className="muted">Chargement du tableau de bord...</p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card">
          <div className="message message--error">{loadError}</div>
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          label="Entreprises"
          value={String(safeCompanies.length)}
          helper="Nombre total d'entreprises clientes"
        />
        <StatCard
          label="Licences actives"
          value={String(activeLicenses.length)}
          helper="Licences actuellement utilisables"
        />
        <StatCard
          label="Licences bloquées"
          value={String(blockedLicenses.length)}
          helper="Suspendues ou révoquées"
        />
        <StatCard
          label="Appareils activés"
          value={String(activatedDevices)}
          helper="Activations non désactivées"
        />
        <StatCard
          label="Expirations proches"
          value={String(expiringSoon.length)}
          helper="Sous 30 jours"
        />
      </div>

      <div className="grid-2-wide">
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Nouvelle entreprise</h2>
              <p className="muted">
                Créer entreprise + administrateur + licence en une seule étape.
              </p>
            </div>
          </div>

          <form className="stack" onSubmit={handleSubmit}>
            <div className="field-grid">
              <div className="field">
                <label className="label" htmlFor="company-name">
                  Nom de l'entreprise
                </label>
                <input
                  id="company-name"
                  className="input"
                  value={form.companyName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      companyName: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="contact-email">
                  Email de contact
                </label>
                <input
                  id="contact-email"
                  className="input"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contactEmail: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="contact-phone">
                  Téléphone de contact
                </label>
                <input
                  id="contact-phone"
                  className="input"
                  value={form.contactPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      contactPhone: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="admin-name">
                  Nom administrateur
                </label>
                <input
                  id="admin-name"
                  className="input"
                  value={form.adminName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adminName: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="admin-email">
                  Email administrateur
                </label>
                <input
                  id="admin-email"
                  className="input"
                  type="email"
                  value={form.adminEmail}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      adminEmail: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="admin-password">
                  Mot de passe temporaire
                </label>
                <div className="actions">
                  <input
                    id="admin-password"
                    className="input"
                    value={form.adminPassword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        adminPassword: event.target.value,
                      }))
                    }
                    placeholder="Laisser vide pour générer"
                  />
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        adminPassword: generateTemporaryPassword(),
                      }))
                    }
                  >
                    Générer
                  </button>
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="max-devices">
                  Appareils autorisés
                </label>
                <input
                  id="max-devices"
                  className="input"
                  type="number"
                  min={1}
                  value={form.maxDevices}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxDevices: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="expires-at">
                  Date d'expiration
                </label>
                <input
                  id="expires-at"
                  className="input"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="company-notes">
                Notes entreprise
              </label>
              <textarea
                id="company-notes"
                className="textarea"
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="license-note">
                Note licence
              </label>
              <textarea
                id="license-note"
                className="textarea"
                value={form.licenseNote}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    licenseNote: event.target.value,
                  }))
                }
              />
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.forcePasswordChange}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    forcePasswordChange: event.target.checked,
                  }))
                }
              />
              <span>Forcer le changement du mot de passe au premier login</span>
            </label>

            {submitMessage ? (
              <div
                className={`message ${
                  submitMessage.type === "error"
                    ? "message--error"
                    : "message--success"
                }`}
              >
                {submitMessage.text}
                {creationCompany
                  ? ` Entreprise créée : ${creationCompany.name}.`
                  : ""}
              </div>
            ) : null}

            <div className="actions">
              <button
                className="button button--primary"
                type="submit"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting
                  ? "Création..."
                  : "Créer entreprise + administrateur + licence"}
              </button>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setForm(createEmptyBundleForm())}
                disabled={isSubmitting}
              >
                Réinitialiser
              </button>
            </div>
          </form>
        </div>

        <div className="stack">
          <div className="card">
            <div className="section-header">
              <div>
                <h2>Accès rapides</h2>
                <p className="muted">Navigation propriétaire</p>
              </div>
            </div>

            <div className="quick-links">
              <Link className="quick-link" to="/companies">
                Entreprises
              </Link>
              <Link className="quick-link" to="/admins">
                Administrateurs
              </Link>
              <Link className="quick-link" to="/licenses">
                Licences
              </Link>
              <Link className="quick-link" to="/devices">
                Appareils
              </Link>
            </div>
          </div>

          {creationResult ? (
            <div className="card">
              <div className="section-header">
                <div>
                  <h2>Création réussie</h2>
                  <p className="muted">
                    La clé de licence et le mot de passe temporaire ne sont
                    affichés qu'une seule fois.
                  </p>
                </div>
                <span className="badge badge--success">Succès</span>
              </div>

              <div className="list">
                <div className="detail-item">
                  <div className="label">Entreprise</div>
                  <div>{creationResult.company.name}</div>
                </div>

                <div className="detail-item">
                  <div className="split">
                    <div>
                      <div className="label">Licence</div>
                      <div className="mono">{creationResult.license.license_key}</div>
                    </div>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() =>
                        void handleCopy(
                          creationResult.license.license_key,
                          "Clé de licence copiée.",
                        )
                      }
                    >
                      Copier la clé de licence
                    </button>
                  </div>
                </div>

                <div className="detail-item">
                  <div className="split">
                    <div>
                      <div className="label">Administrateur</div>
                      <div>{creationResult.admin.email}</div>
                      <div className="mono">
                        {creationResult.admin.temporary_password}
                      </div>
                    </div>
                    <button
                      className="button button--secondary"
                      type="button"
                      onClick={() =>
                        void handleCopy(
                          `Email: ${creationResult.admin.email}\nMot de passe: ${creationResult.admin.temporary_password}`,
                          "Identifiants administrateur copiés.",
                        )
                      }
                    >
                      Copier les identifiants administrateur
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="section-header">
                <div>
                  <h2>Dernières licences</h2>
                  <p className="muted">Aperçu des licences récentes</p>
                </div>
                {isLoading ? (
                  <span className="badge badge--neutral">Chargement...</span>
                ) : null}
              </div>

              <div className="list">
                {safeLicenses.slice(0, 4).map((license) => (
                  <div className="detail-item" key={license.id}>
                    <div className="split">
                      <div>
                        <div>
                          {license.company_name ??
                            license.customer_name ??
                            "Sans entreprise"}
                        </div>
                        <div className="muted">
                          Créée le {formatDate(license.created_at)}
                        </div>
                      </div>
                      <span
                        className={`badge ${getLicenseStatusTone(license.status)}`}
                      >
                        {getLicenseStatusLabel(license.status)}
                      </span>
                    </div>
                    <div className="muted">
                      Appareils activés : {license.active_device_count} /{" "}
                      {license.max_devices}
                    </div>
                  </div>
                ))}

                {!isLoading && safeLicenses.length === 0 ? (
                  <div className="empty-state">
                    Aucune licence disponible pour le moment.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
