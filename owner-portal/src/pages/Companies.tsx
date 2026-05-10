import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "../components/PageShell";
import { useOwnerPortal } from "../components/OwnerPortalProvider";
import {
  getOwnerCompany,
  listOwnerCompanies,
  updateOwnerCompany,
} from "../services/ownerLicenseAdminService";
import type {
  OwnerCompanyDetail,
  OwnerCompanyStatus,
  OwnerCompanySummary,
} from "../types";
import {
  formatDate,
  getCompanyStatusLabel,
  getCompanyStatusTone,
  getLicenseStatusLabel,
  getLicenseStatusTone,
} from "../utils";

interface CompanyEditFormState {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  status: OwnerCompanyStatus;
}

function createEmptyCompanyForm(): CompanyEditFormState {
  return {
    companyName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    status: "active",
  };
}

function toCompanyEditForm(company: OwnerCompanyDetail): CompanyEditFormState {
  return {
    companyName: company.name,
    contactEmail: company.contact_email,
    contactPhone: company.contact_phone ?? "",
    notes: company.notes ?? "",
    status: company.status,
  };
}

export default function CompaniesPage() {
  const { ownerAdminKey } = useOwnerPortal();
  const [companies, setCompanies] = useState<OwnerCompanySummary[]>([]);
  const [selectedCompany, setSelectedCompany] =
    useState<OwnerCompanyDetail | null>(null);
  const [companyForm, setCompanyForm] =
    useState<CompanyEditFormState>(createEmptyCompanyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!ownerAdminKey) {
      setCompanies([]);
      setSelectedCompany(null);
      setMessage(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setMessage(null);

    void listOwnerCompanies(ownerAdminKey)
      .then((nextCompanies) => {
        if (active) {
          setCompanies(nextCompanies);
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

  const loadCompanyDetail = async (companyId: string) => {
    if (!ownerAdminKey) {
      return;
    }

    try {
      const detail = await getOwnerCompany(ownerAdminKey, companyId);
      setSelectedCompany(detail);
      setCompanyForm(toCompanyEditForm(detail));
      setMessage(null);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Détail entreprise indisponible.",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey || !selectedCompany) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedCompany = await updateOwnerCompany(
        ownerAdminKey,
        selectedCompany.id,
        {
          company_name: companyForm.companyName,
          contact_email: companyForm.contactEmail,
          contact_phone: companyForm.contactPhone || null,
          notes: companyForm.notes || null,
          status: companyForm.status,
        },
      );

      setSelectedCompany(updatedCompany);
      setCompanyForm(toCompanyEditForm(updatedCompany));
      setCompanies(await listOwnerCompanies(ownerAdminKey));
      setMessage({ type: "success", text: "Entreprise mise à jour." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Mise à jour entreprise impossible.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageShell
      title="Entreprises"
      description="Consultez les entreprises clientes, leurs licences liées et leurs administrateurs principaux."
    >
      <div className="grid-2-wide">
        <div className="card">
          <div className="section-header">
            <div>
              <h2>Entreprises</h2>
              <p className="muted">{companies.length} entreprise(s) cliente(s)</p>
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
                  <th>Email de contact</th>
                  <th>Téléphone</th>
                  <th>Statut</th>
                  <th>Licences</th>
                  <th>Administrateur principal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.name}</td>
                    <td>{company.contact_email}</td>
                    <td>{company.contact_phone || "-"}</td>
                    <td>
                      <span
                        className={`badge ${getCompanyStatusTone(company.status)}`}
                      >
                        {getCompanyStatusLabel(company.status)}
                      </span>
                    </td>
                    <td>{company.license_count}</td>
                    <td>{company.primary_admin_name ?? "-"}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="button button--secondary"
                          type="button"
                          onClick={() => void loadCompanyDetail(company.id)}
                        >
                          Voir détails
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && companies.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        Aucune entreprise disponible.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <h2>Détail entreprise</h2>
              <p className="muted">
                Sélectionnez une entreprise pour modifier ses informations.
              </p>
            </div>
          </div>

          {selectedCompany ? (
            <div className="stack">
              <div className="detail-item">
                <div className="label">Entreprise</div>
                <div className="split">
                  <div>
                    <div>{selectedCompany.name}</div>
                    <div className="muted">
                      Créée le {formatDate(selectedCompany.created_at)}
                    </div>
                  </div>
                  <div className="actions">
                    <span
                      className={`badge ${getCompanyStatusTone(selectedCompany.status)}`}
                    >
                      {getCompanyStatusLabel(selectedCompany.status)}
                    </span>
                    <span className="badge badge--neutral">
                      {selectedCompany.license_count} licence(s)
                    </span>
                    <span className="badge badge--neutral">
                      {selectedCompany.admin_count} administrateur(s)
                    </span>
                  </div>
                </div>
              </div>

              <form className="stack" onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label" htmlFor="edit-company-name">
                    Nom de l'entreprise
                  </label>
                  <input
                    id="edit-company-name"
                    className="input"
                    value={companyForm.companyName}
                    onChange={(event) =>
                      setCompanyForm((current) => ({
                        ...current,
                        companyName: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-contact-email">
                    Email de contact
                  </label>
                  <input
                    id="edit-contact-email"
                    className="input"
                    type="email"
                    value={companyForm.contactEmail}
                    onChange={(event) =>
                      setCompanyForm((current) => ({
                        ...current,
                        contactEmail: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-contact-phone">
                    Téléphone de contact
                  </label>
                  <input
                    id="edit-contact-phone"
                    className="input"
                    value={companyForm.contactPhone}
                    onChange={(event) =>
                      setCompanyForm((current) => ({
                        ...current,
                        contactPhone: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-company-status">
                    Statut
                  </label>
                  <select
                    id="edit-company-status"
                    className="select"
                    value={companyForm.status}
                    onChange={(event) =>
                      setCompanyForm((current) => ({
                        ...current,
                        status: event.target.value as OwnerCompanyStatus,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspendue</option>
                    <option value="archived">Archivée</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-company-notes">
                    Notes
                  </label>
                  <textarea
                    id="edit-company-notes"
                    className="textarea"
                    value={companyForm.notes}
                    onChange={(event) =>
                      setCompanyForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="actions">
                  <button
                    className="button button--primary"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? "Enregistrement..." : "Modifier"}
                  </button>
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => setCompanyForm(toCompanyEditForm(selectedCompany))}
                    disabled={isSaving}
                  >
                    Annuler les modifications
                  </button>
                </div>
              </form>

              <div className="detail-item">
                <div className="label">Administrateurs</div>
                <div className="list">
                  {selectedCompany.admins.length > 0 ? (
                    selectedCompany.admins.map((admin) => (
                      <div className="detail-item" key={admin.id}>
                        <div>{admin.name}</div>
                        <div className="muted">{admin.email}</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Aucun administrateur lié.</div>
                  )}
                </div>
              </div>

              <div className="detail-item">
                <div className="label">Licences</div>
                <div className="list">
                  {selectedCompany.licenses.length > 0 ? (
                    selectedCompany.licenses.map((license) => (
                      <div className="detail-item" key={license.id}>
                        <div className="split">
                          <div className="mono">{license.id}</div>
                          <span
                            className={`badge ${getLicenseStatusTone(
                              license.status,
                            )}`}
                          >
                            {getLicenseStatusLabel(license.status)}
                          </span>
                        </div>
                        <div className="muted">
                          Expiration : {formatDate(license.expires_at)} | Appareils
                          : {license.active_device_count} / {license.max_devices}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">Aucune licence liée.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              Sélectionnez une entreprise pour afficher ses licences,
              administrateurs et informations détaillées.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
