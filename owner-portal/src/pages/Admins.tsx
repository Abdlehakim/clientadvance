import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "../components/PageShell";
import { useOwnerPortal } from "../components/OwnerPortalProvider";
import {
  createOwnerCompanyAdmin,
  disableOwnerAdmin,
  enableOwnerAdmin,
  getOwnerCompany,
  getOwnerLicense,
  listOwnerAdmins,
  listOwnerCompanies,
  reactivateOwnerLicense,
  resetOwnerAdminPassword,
  revokeOwnerLicense,
  suspendOwnerLicense,
  updateOwnerAdmin,
} from "../services/ownerLicenseAdminService";
import type {
  OwnerAdminPasswordResetResponse,
  OwnerAdminSummary,
  OwnerCompanySummary,
  OwnerLicenseDetail,
  OwnerLicenseSummary,
} from "../types";
import {
  copyToClipboard,
  formatDate,
  formatDateTime,
  getActivationStatusLabel,
  getActivationStatusTone,
  generateTemporaryPassword,
  getAdminStatusLabel,
  getAdminStatusTone,
  getLicenseStatusLabel,
  getLicenseStatusTone,
  getServerModeLabel,
} from "../utils";

interface CreateAdminFormState {
  companyId: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  forcePasswordChange: boolean;
}

interface EditAdminFormState {
  name: string;
  email: string;
}

const LICENSE_KEY_UNAVAILABLE_LABEL = "Clé non disponible après création";

function createEmptyCreateForm(): CreateAdminFormState {
  return {
    companyId: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    forcePasswordChange: false,
  };
}

function createEmptyEditForm(): EditAdminFormState {
  return {
    name: "",
    email: "",
  };
}

function toEditForm(admin: OwnerAdminSummary): EditAdminFormState {
  return {
    name: admin.name,
    email: admin.email,
  };
}

export default function AdminsPage() {
  const { ownerAdminKey } = useOwnerPortal();
  const [companies, setCompanies] = useState<OwnerCompanySummary[]>([]);
  const [admins, setAdmins] = useState<OwnerAdminSummary[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<OwnerAdminSummary | null>(
    null,
  );
  const [createForm, setCreateForm] =
    useState<CreateAdminFormState>(createEmptyCreateForm);
  const [editForm, setEditForm] = useState<EditAdminFormState>(createEmptyEditForm);
  const [passwordResult, setPasswordResult] =
    useState<OwnerAdminPasswordResetResponse | null>(null);
  const [adminCompanyLicenses, setAdminCompanyLicenses] = useState<
    OwnerLicenseSummary[]
  >([]);
  const [selectedLicenseDetail, setSelectedLicenseDetail] =
    useState<OwnerLicenseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLicenses, setIsLoadingLicenses] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!ownerAdminKey) {
      setCompanies([]);
      setAdmins([]);
      setSelectedAdmin(null);
      setAdminCompanyLicenses([]);
      setSelectedLicenseDetail(null);
      setMessage(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setMessage(null);

    void Promise.all([
      listOwnerCompanies(ownerAdminKey),
      listOwnerAdmins(ownerAdminKey),
    ])
      .then(([nextCompanies, nextAdmins]) => {
        if (!active) {
          return;
        }

        setCompanies(nextCompanies);
        setAdmins(nextAdmins);
        setCreateForm((current) => ({
          ...current,
          companyId: current.companyId || nextCompanies[0]?.id || "",
        }));
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

  const refreshAdmins = async () => {
    if (!ownerAdminKey) {
      return;
    }

    const nextAdmins = await listOwnerAdmins(ownerAdminKey);
    setAdmins(nextAdmins);

    if (selectedAdmin) {
      const refreshedSelected =
        nextAdmins.find((admin) => admin.id === selectedAdmin.id) ?? null;
      setSelectedAdmin(refreshedSelected);
      setEditForm(refreshedSelected ? toEditForm(refreshedSelected) : createEmptyEditForm());
      if (!refreshedSelected) {
        setAdminCompanyLicenses([]);
        setSelectedLicenseDetail(null);
      }
    }
  };

  const loadAdminCompanyLicenses = async (admin: OwnerAdminSummary | null) => {
    if (!ownerAdminKey || !admin?.company_id) {
      setAdminCompanyLicenses([]);
      setSelectedLicenseDetail(null);
      return;
    }

    setIsLoadingLicenses(true);

    try {
      const company = await getOwnerCompany(ownerAdminKey, admin.company_id);
      setAdminCompanyLicenses(company.licenses);
      setSelectedLicenseDetail((current) =>
        current && company.licenses.some((license) => license.id === current.id)
          ? current
          : null,
      );
    } catch (error) {
      setAdminCompanyLicenses([]);
      setSelectedLicenseDetail(null);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Chargement des licences impossible.",
      });
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const selectAdmin = (admin: OwnerAdminSummary) => {
    setSelectedAdmin(admin);
    setEditForm(toEditForm(admin));
    setAdminCompanyLicenses([]);
    setSelectedLicenseDetail(null);
    void loadAdminCompanyLicenses(admin);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey) {
      return;
    }

    if (!createForm.companyId) {
      setMessage({ type: "error", text: "Choisissez une entreprise." });
      return;
    }

    setIsCreating(true);
    setPasswordResult(null);

    try {
      const result = await createOwnerCompanyAdmin(ownerAdminKey, createForm.companyId, {
        admin_name: createForm.adminName,
        admin_email: createForm.adminEmail,
        admin_password: createForm.adminPassword || undefined,
        force_password_change: createForm.forcePasswordChange,
      });

      await refreshAdmins();
      setPasswordResult(result);
      setCreateForm((current) => ({
        ...createEmptyCreateForm(),
        companyId: current.companyId,
      }));
      setMessage({
        type: "success",
        text: "Compte administrateur créé avec succès.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Création administrateur impossible.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey || !selectedAdmin) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedAdmin = await updateOwnerAdmin(ownerAdminKey, selectedAdmin.id, {
        name: editForm.name,
        email: editForm.email,
      });

      setSelectedAdmin(updatedAdmin);
      setEditForm(toEditForm(updatedAdmin));
      await refreshAdmins();
      setMessage({ type: "success", text: "Administrateur mis à jour." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Mise à jour administrateur impossible.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (admin: OwnerAdminSummary) => {
    if (!ownerAdminKey) {
      return;
    }

    try {
      const result = await resetOwnerAdminPassword(ownerAdminKey, admin.id, {
        force_password_change: true,
      });

      setPasswordResult(result);
      await refreshAdmins();
      setMessage({ type: "success", text: "Mot de passe réinitialisé." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Réinitialisation du mot de passe impossible.",
      });
    }
  };

  const handleToggleAdmin = async (admin: OwnerAdminSummary) => {
    if (!ownerAdminKey) {
      return;
    }

    try {
      if (admin.is_active) {
        await disableOwnerAdmin(ownerAdminKey, admin.id);
      } else {
        await enableOwnerAdmin(ownerAdminKey, admin.id);
      }

      await refreshAdmins();
      setMessage({
        type: "success",
        text: admin.is_active ? "Administrateur désactivé." : "Administrateur réactivé.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Action administrateur impossible.",
      });
    }
  };

  const handleViewLicenseDevices = async (licenseId: string) => {
    if (!ownerAdminKey) {
      return;
    }

    setIsLoadingLicenses(true);

    try {
      const detail = await getOwnerLicense(ownerAdminKey, licenseId);
      setSelectedLicenseDetail(detail);
      setMessage(null);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Détail licence indisponible.",
      });
    } finally {
      setIsLoadingLicenses(false);
    }
  };

  const handleLicenseAction = async (
    licenseId: string,
    action: "revoke" | "suspend" | "reactivate",
  ) => {
    if (!ownerAdminKey) {
      return;
    }

    try {
      const updated =
        action === "revoke"
          ? await revokeOwnerLicense(ownerAdminKey, licenseId)
          : action === "suspend"
            ? await suspendOwnerLicense(ownerAdminKey, licenseId)
            : await reactivateOwnerLicense(ownerAdminKey, licenseId);

      if (selectedLicenseDetail?.id === updated.id) {
        setSelectedLicenseDetail(updated);
      }

      await loadAdminCompanyLicenses(selectedAdmin);
      setMessage({
        type: "success",
        text:
          action === "revoke"
            ? "Licence révoquée."
            : action === "suspend"
              ? "Licence suspendue."
              : "Licence réactivée.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Action licence impossible.",
      });
    }
  };

  const handleCopyCredentials = async () => {
    if (!passwordResult) {
      return;
    }

    try {
      await copyToClipboard(
        `Email: ${passwordResult.admin.email}\nMot de passe: ${passwordResult.temporary_password}`,
      );
      setMessage({
        type: "success",
        text: "Identifiants administrateur copiés.",
      });
    } catch {
      setMessage({ type: "error", text: "Copie impossible." });
    }
  };

  const handleCopyLicenseKey = async (licenseKey: string) => {
    const normalizedLicenseKey = licenseKey.trim();

    if (!normalizedLicenseKey) {
      return;
    }

    try {
      await copyToClipboard(normalizedLicenseKey);
      setMessage({
        type: "success",
        text: "Clé d’activation copiée.",
      });
    } catch {
      setMessage({ type: "error", text: "Copie impossible." });
    }
  };

  const renderLicenseActivationKey = (
    licenseKey: string | null | undefined,
  ) => {
    const normalizedLicenseKey = licenseKey?.trim() ?? "";

    if (normalizedLicenseKey) {
      return (
        <>
          <div className="mono">{normalizedLicenseKey}</div>
          <div className="actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => void handleCopyLicenseKey(normalizedLicenseKey)}
            >
              Copier
            </button>
          </div>
        </>
      );
    }

    return <div className="muted">{LICENSE_KEY_UNAVAILABLE_LABEL}</div>;
  };

  return (
    <PageShell
      title="Administrateurs"
      description="Créez les comptes administrateur des entreprises clientes, réinitialisez leurs mots de passe temporaires et activez ou désactivez leurs accès."
    >
      <div className="grid-2-wide">
        <div className="stack">
          <div className="card">
            <div className="section-header">
              <div>
                <h2>Administrateurs</h2>
                <p className="muted">{admins.length} compte(s) administrateur(s)</p>
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
                    <th>Nom administrateur</th>
                    <th>Email</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id}>
                      <td>{admin.company_name ?? "-"}</td>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>
                        <span
                          className={`badge ${getAdminStatusTone(admin.is_active)}`}
                        >
                          {getAdminStatusLabel(admin.is_active)}
                        </span>
                      </td>
                      <td>{formatDate(admin.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => selectAdmin(admin)}
                          >
                            Modifier
                          </button>
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => void handleResetPassword(admin)}
                          >
                            Réinitialiser
                          </button>
                          <button
                            className={
                              admin.is_active
                                ? "button button--danger"
                                : "button button--secondary"
                            }
                            type="button"
                            onClick={() => void handleToggleAdmin(admin)}
                          >
                            {admin.is_active ? "Désactiver" : "Réactiver"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && admins.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          Aucun administrateur disponible.
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
                <h2>Créer entreprise + administrateur + licence</h2>
                <p className="muted">
                  Pour le provisioning complet, utilisez le Tableau de bord.
                </p>
              </div>
            </div>
            <p className="muted">
              Ce module ajoute un administrateur à une entreprise existante.
            </p>
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h2>Administrateur de l'entreprise</h2>
                <p className="muted">
                  Créez un compte administrateur lié à une entreprise existante.
                </p>
              </div>
            </div>

            <form className="stack" onSubmit={handleCreate}>
              <div className="field">
                <label className="label" htmlFor="create-admin-company">
                  Entreprise
                </label>
                <select
                  id="create-admin-company"
                  className="select"
                  value={createForm.companyId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      companyId: event.target.value,
                    }))
                  }
                >
                  <option value="">Choisir une entreprise</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="create-admin-name">
                  Nom administrateur
                </label>
                <input
                  id="create-admin-name"
                  className="input"
                  value={createForm.adminName}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      adminName: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="create-admin-email">
                  Email administrateur
                </label>
                <input
                  id="create-admin-email"
                  className="input"
                  type="email"
                  value={createForm.adminEmail}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      adminEmail: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="create-admin-password">
                  Mot de passe temporaire
                </label>
                <div className="actions">
                  <input
                    id="create-admin-password"
                    className="input"
                    value={createForm.adminPassword}
                    onChange={(event) =>
                      setCreateForm((current) => ({
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
                      setCreateForm((current) => ({
                        ...current,
                        adminPassword: generateTemporaryPassword(),
                      }))
                    }
                  >
                    Générer
                  </button>
                </div>
              </div>

              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={createForm.forcePasswordChange}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      forcePasswordChange: event.target.checked,
                    }))
                  }
                />
                <span>Forcer le changement du mot de passe</span>
              </label>

              <div className="actions">
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? "Création..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="section-header">
              <div>
                <h2>Modifier administrateur</h2>
                <p className="muted">
                  Mettez à jour le nom et l'email d'un administrateur.
                </p>
              </div>
            </div>

            {selectedAdmin ? (
              <form className="stack" onSubmit={handleUpdate}>
                <div className="detail-item">
                  <div>{selectedAdmin.company_name ?? "Entreprise non liée"}</div>
                  <div className="mono">{selectedAdmin.id}</div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-admin-name">
                    Nom administrateur
                  </label>
                  <input
                    id="edit-admin-name"
                    className="input"
                    value={editForm.name}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-admin-email">
                    Email administrateur
                  </label>
                  <input
                    id="edit-admin-email"
                    className="input"
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        email: event.target.value,
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
                    onClick={() => setEditForm(toEditForm(selectedAdmin))}
                    disabled={isSaving}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div className="empty-state">
                Sélectionnez un administrateur pour modifier son nom ou son
                email.
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h2>Licences de l’entreprise</h2>
                <p className="muted">
                  Licences liées à l’entreprise de l’administrateur sélectionné.
                </p>
              </div>
              {isLoadingLicenses ? (
                <span className="badge badge--neutral">Chargement...</span>
              ) : null}
            </div>

            {selectedAdmin ? (
              selectedAdmin.company_id ? (
                <div className="stack">
                  <div className="list">
                    {adminCompanyLicenses.length > 0 ? (
                      adminCompanyLicenses.map((license) => (
                        <div className="detail-item" key={license.id}>
                          <div className="split">
                            <div>
                              <div className="label">Entreprise</div>
                              <div>
                                {license.company_name ??
                                  selectedAdmin.company_name ??
                                  license.customer_name ??
                                  "-"}
                              </div>
                            </div>
                            <div>
                              <div className="label">Statut licence</div>
                              <span
                                className={`badge ${getLicenseStatusTone(
                                  license.status,
                                )}`}
                              >
                                {getLicenseStatusLabel(license.status)}
                              </span>
                            </div>
                          </div>
                          <div className="muted">
                            Expiration : {formatDate(license.expires_at)}
                          </div>
                          <div className="muted">
                            Appareils activés / Max appareils :{" "}
                            {license.active_device_count} / {license.max_devices}
                          </div>
                          <div className="muted">
                            Mode :{" "}
                            {license.server_mode
                              ? getServerModeLabel(license.server_mode)
                              : "-"}
                          </div>
                          <div className="label">Clé d’activation</div>
                          {renderLicenseActivationKey(license.license_key)}
                          <div className="actions">
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() =>
                                void handleViewLicenseDevices(license.id)
                              }
                            >
                              Voir appareils
                            </button>
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => {
                                if (window.confirm("Révoquer cette licence ?")) {
                                  void handleLicenseAction(license.id, "revoke");
                                }
                              }}
                            >
                              Révoquer
                            </button>
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() =>
                                void handleLicenseAction(license.id, "suspend")
                              }
                            >
                              Suspendre
                            </button>
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() =>
                                void handleLicenseAction(
                                  license.id,
                                  "reactivate",
                                )
                              }
                            >
                              Réactiver
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        Aucune licence liée à cette entreprise.
                      </div>
                    )}
                  </div>

                  {selectedLicenseDetail ? (
                    <div className="detail-item">
                      <div className="label">Appareils activés</div>
                      <div className="list">
                        {selectedLicenseDetail.activations.length > 0 ? (
                          selectedLicenseDetail.activations.map((activation) => (
                            <div className="detail-item" key={activation.id}>
                              <div className="split">
                                <div>
                                  <div className="mono">
                                    {activation.device_id}
                                  </div>
                                  <div className="muted">
                                    App version : {activation.app_version ?? "-"}
                                  </div>
                                  <div className="muted">
                                    Activé le{" "}
                                    {formatDateTime(activation.activated_at)}
                                  </div>
                                </div>
                                <span
                                  className={`badge ${getActivationStatusTone(
                                    activation,
                                  )}`}
                                >
                                  {getActivationStatusLabel(activation)}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            Aucun appareil activé pour cette licence.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="empty-state">
                  Aucune entreprise liée à cet administrateur.
                </div>
              )
            ) : (
              <div className="empty-state">
                Sélectionnez un administrateur pour afficher les licences liées.
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h2>Mot de passe temporaire</h2>
                <p className="muted">
                  Le mot de passe temporaire n'est affiché qu'une seule fois.
                </p>
              </div>
            </div>

            {passwordResult ? (
              <div className="detail-item">
                <div>{passwordResult.admin.email}</div>
                <div className="mono">{passwordResult.temporary_password}</div>
                <div className="actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => void handleCopyCredentials()}
                  >
                    Copier les identifiants administrateur
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                Réinitialisez un mot de passe ou créez un nouvel administrateur
                pour afficher les identifiants temporaires.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
