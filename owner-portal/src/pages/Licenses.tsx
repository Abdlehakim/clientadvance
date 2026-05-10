import { useEffect, useState, type FormEvent } from "react";
import { PageShell } from "../components/PageShell";
import { useOwnerPortal } from "../components/OwnerPortalProvider";
import {
  createOwnerLicense,
  deactivateOwnerLicenseDevice,
  getOwnerLicense,
  listOwnerCompanies,
  listOwnerLicenses,
  reactivateOwnerLicense,
  revokeOwnerLicense,
  suspendOwnerLicense,
  updateOwnerLicense,
} from "../services/ownerLicenseAdminService";
import type {
  LicenseAdminStatus,
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
  getLicenseStatusLabel,
  getLicenseStatusTone,
  isoToLocalInput,
  localInputToIso,
} from "../utils";

interface CreateLicenseFormState {
  companyId: string;
  customerName: string;
  expiresAt: string;
  maxDevices: string;
  note: string;
}

interface EditLicenseFormState {
  customerName: string;
  expiresAt: string;
  maxDevices: string;
  note: string;
  status: LicenseAdminStatus;
}

function createEmptyCreateForm(): CreateLicenseFormState {
  return {
    companyId: "",
    customerName: "",
    expiresAt: "",
    maxDevices: "1",
    note: "",
  };
}

function createEmptyEditForm(): EditLicenseFormState {
  return {
    customerName: "",
    expiresAt: "",
    maxDevices: "1",
    note: "",
    status: "active",
  };
}

function toEditForm(license: OwnerLicenseDetail): EditLicenseFormState {
  return {
    customerName: license.customer_name ?? "",
    expiresAt: isoToLocalInput(license.expires_at),
    maxDevices: String(license.max_devices),
    note: license.note ?? "",
    status: license.status,
  };
}

export default function LicensesPage() {
  const { ownerAdminKey } = useOwnerPortal();
  const [companies, setCompanies] = useState<OwnerCompanySummary[]>([]);
  const [licenses, setLicenses] = useState<OwnerLicenseSummary[]>([]);
  const [selectedLicense, setSelectedLicense] =
    useState<OwnerLicenseDetail | null>(null);
  const [createForm, setCreateForm] =
    useState<CreateLicenseFormState>(createEmptyCreateForm);
  const [editForm, setEditForm] = useState<EditLicenseFormState>(createEmptyEditForm);
  const [createdLicenseKey, setCreatedLicenseKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!ownerAdminKey) {
      setCompanies([]);
      setLicenses([]);
      setSelectedLicense(null);
      setMessage(null);
      return;
    }

    let active = true;
    setIsLoading(true);
    setMessage(null);

    void Promise.all([
      listOwnerCompanies(ownerAdminKey),
      listOwnerLicenses(ownerAdminKey),
    ])
      .then(([nextCompanies, nextLicenses]) => {
        if (!active) {
          return;
        }

        setCompanies(nextCompanies);
        setLicenses(nextLicenses);
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

  const refreshLicenses = async () => {
    if (!ownerAdminKey) {
      return;
    }

    const nextLicenses = await listOwnerLicenses(ownerAdminKey);
    setLicenses(nextLicenses);

    if (selectedLicense) {
      const detail = await getOwnerLicense(ownerAdminKey, selectedLicense.id);
      setSelectedLicense(detail);
      setEditForm(toEditForm(detail));
    }
  };

  const loadLicenseDetail = async (licenseId: string) => {
    if (!ownerAdminKey) {
      return;
    }

    try {
      const detail = await getOwnerLicense(ownerAdminKey, licenseId);
      setSelectedLicense(detail);
      setEditForm(toEditForm(detail));
      setMessage(null);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Détail licence indisponible.",
      });
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey) {
      return;
    }

    setIsCreating(true);
    setCreatedLicenseKey("");

    try {
      const result = await createOwnerLicense(ownerAdminKey, {
        company_id: createForm.companyId || null,
        customer_name: createForm.customerName || null,
        expires_at: localInputToIso(createForm.expiresAt),
        note: createForm.note || null,
        max_devices: Number.parseInt(createForm.maxDevices, 10) || 1,
      });

      setCreatedLicenseKey(result.license_key);
      setSelectedLicense(result.license);
      setEditForm(toEditForm(result.license));
      await refreshLicenses();
      setCreateForm((current) => ({
        ...createEmptyCreateForm(),
        companyId: current.companyId,
      }));
      setMessage({ type: "success", text: "Licence créée avec succès." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Création licence impossible.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey || !selectedLicense) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedLicense = await updateOwnerLicense(
        ownerAdminKey,
        selectedLicense.id,
        {
          customer_name: editForm.customerName || null,
          expires_at: localInputToIso(editForm.expiresAt),
          note: editForm.note || null,
          status: editForm.status,
          max_devices: Number.parseInt(editForm.maxDevices, 10) || 1,
        },
      );

      setSelectedLicense(updatedLicense);
      setEditForm(toEditForm(updatedLicense));
      await refreshLicenses();
      setMessage({ type: "success", text: "Licence mise à jour." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Mise à jour licence impossible.",
      });
    } finally {
      setIsSaving(false);
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

      if (selectedLicense?.id === updated.id) {
        setSelectedLicense(updated);
        setEditForm(toEditForm(updated));
      }

      await refreshLicenses();
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

  const handleDeactivateDevice = async (
    licenseId: string,
    activationId: string,
  ) => {
    if (!ownerAdminKey) {
      return;
    }

    if (!window.confirm("Désactiver cet appareil ?")) {
      return;
    }

    try {
      const updatedLicense = await deactivateOwnerLicenseDevice(
        ownerAdminKey,
        licenseId,
        activationId,
      );

      setSelectedLicense(updatedLicense);
      setEditForm(toEditForm(updatedLicense));
      await refreshLicenses();
      setMessage({ type: "success", text: "Appareil désactivé." });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Désactivation impossible.",
      });
    }
  };

  const handleCopyLicenseKey = async () => {
    if (!createdLicenseKey) {
      return;
    }

    try {
      await copyToClipboard(createdLicenseKey);
      setMessage({
        type: "success",
        text: "Clé de licence copiée.",
      });
    } catch {
      setMessage({ type: "error", text: "Copie impossible." });
    }
  };

  return (
    <PageShell
      title="Licences"
      description="Créez des licences, contrôlez leur statut et gérez les activations d'appareils depuis le portail propriétaire."
    >
      <div className="grid-2-wide">
        <div className="stack">
          <div className="card">
            <div className="section-header">
              <div>
                <h2>Nouvelle licence</h2>
                <p className="muted">
                  La clé brute n'est affichée qu'une seule fois après création.
                </p>
              </div>
            </div>

            <form className="stack" onSubmit={handleCreate}>
              <div className="field">
                <label className="label" htmlFor="license-company">
                  Entreprise
                </label>
                <select
                  id="license-company"
                  className="select"
                  value={createForm.companyId}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      companyId: event.target.value,
                    }))
                  }
                >
                  <option value="">Aucune entreprise liée</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-grid">
                <div className="field">
                  <label className="label" htmlFor="license-customer-name">
                    Client / Entreprise
                  </label>
                  <input
                    id="license-customer-name"
                    className="input"
                    value={createForm.customerName}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="license-max-devices">
                    Appareils autorisés
                  </label>
                  <input
                    id="license-max-devices"
                    className="input"
                    type="number"
                    min={1}
                    value={createForm.maxDevices}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        maxDevices: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="license-expires-at">
                    Date d'expiration
                  </label>
                  <input
                    id="license-expires-at"
                    className="input"
                    type="datetime-local"
                    value={createForm.expiresAt}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="field">
                <label className="label" htmlFor="license-note">
                  Note
                </label>
                <textarea
                  id="license-note"
                  className="textarea"
                  value={createForm.note}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="actions">
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? "Création..." : "Créer"}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() =>
                    setCreateForm((current) => ({
                      ...createEmptyCreateForm(),
                      companyId: current.companyId,
                    }))
                  }
                >
                  Réinitialiser
                </button>
              </div>
            </form>

            {createdLicenseKey ? (
              <div className="detail-item">
                <div className="label">Clé de licence</div>
                <div className="mono">{createdLicenseKey}</div>
                <div className="actions">
                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => void handleCopyLicenseKey()}
                  >
                    Copier la clé de licence
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <div className="section-header">
              <div>
                <h2>Licences</h2>
                <p className="muted">{licenses.length} licence(s)</p>
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
                    <th>Statut licence</th>
                    <th>Expiration</th>
                    <th>Appareils activés</th>
                    <th>Max appareils</th>
                    <th>Créée le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((license) => (
                    <tr key={license.id}>
                      <td>
                        {license.company_name ?? license.customer_name ?? "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${getLicenseStatusTone(license.status)}`}
                        >
                          {getLicenseStatusLabel(license.status)}
                        </span>
                      </td>
                      <td>{formatDate(license.expires_at)}</td>
                      <td>{license.active_device_count}</td>
                      <td>{license.max_devices}</td>
                      <td>{formatDate(license.created_at)}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() => void loadLicenseDetail(license.id)}
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
                            onClick={() => void handleLicenseAction(license.id, "suspend")}
                          >
                            Suspendre
                          </button>
                          <button
                            className="button button--secondary"
                            type="button"
                            onClick={() =>
                              void handleLicenseAction(license.id, "reactivate")
                            }
                          >
                            Réactiver
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && licenses.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">Aucune licence disponible.</div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <div>
              <h2>Détail licence</h2>
              <p className="muted">
                Surveillez les activations et désactivez un appareil si
                nécessaire.
              </p>
            </div>
          </div>

          {selectedLicense ? (
            <div className="stack">
              <div className="detail-item">
                <div className="label">Licence</div>
                <div className="mono">{selectedLicense.id}</div>
                <div className="actions">
                  <span
                    className={`badge ${getLicenseStatusTone(selectedLicense.status)}`}
                  >
                    {getLicenseStatusLabel(selectedLicense.status)}
                  </span>
                  <span className="badge badge--neutral">
                    {selectedLicense.active_device_count} / {selectedLicense.max_devices}
                    {" "}
                    appareils
                  </span>
                </div>
                <div className="muted">
                  Entreprise : {selectedLicense.company_name ?? "Aucune"} |
                  {" "}
                  Expiration : {formatDate(selectedLicense.expires_at)}
                </div>
              </div>

              <form className="stack" onSubmit={handleUpdate}>
                <div className="field">
                  <label className="label" htmlFor="edit-license-customer">
                    Client / Entreprise
                  </label>
                  <input
                    id="edit-license-customer"
                    className="input"
                    value={editForm.customerName}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-license-status">
                    Statut
                  </label>
                  <select
                    id="edit-license-status"
                    className="select"
                    value={editForm.status}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        status: event.target.value as LicenseAdminStatus,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspendue</option>
                    <option value="revoked">Révoquée</option>
                    <option value="expired">Expirée</option>
                  </select>
                </div>

                <div className="field-grid">
                  <div className="field">
                    <label className="label" htmlFor="edit-license-expiration">
                      Date d'expiration
                    </label>
                    <input
                      id="edit-license-expiration"
                      className="input"
                      type="datetime-local"
                      value={editForm.expiresAt}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          expiresAt: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="edit-license-max-devices">
                      Appareils autorisés
                    </label>
                    <input
                      id="edit-license-max-devices"
                      className="input"
                      type="number"
                      min={1}
                      value={editForm.maxDevices}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          maxDevices: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="label" htmlFor="edit-license-note">
                    Note
                  </label>
                  <textarea
                    id="edit-license-note"
                    className="textarea"
                    value={editForm.note}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        note: event.target.value,
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
                </div>
              </form>

              <div className="detail-item">
                <div className="label">Appareils activés</div>
                <div className="list">
                  {selectedLicense.activations.length > 0 ? (
                    selectedLicense.activations.map((activation) => (
                      <div className="detail-item" key={activation.id}>
                        <div className="split">
                          <div>
                            <div className="mono">{activation.device_id}</div>
                            <div className="muted">
                              App version : {activation.app_version ?? "-"}
                            </div>
                            <div className="muted">
                              Activé le {formatDateTime(activation.activated_at)}
                            </div>
                            <div className="muted">
                              Dernière vérification :{" "}
                              {formatDateTime(activation.last_checked_at)}
                            </div>
                          </div>
                          <div className="stack">
                            <span
                              className={`badge ${getActivationStatusTone(
                                activation,
                              )}`}
                            >
                              {getActivationStatusLabel(activation)}
                            </span>
                            <button
                              className="button button--secondary"
                              type="button"
                              onClick={() =>
                                void handleDeactivateDevice(
                                  selectedLicense.id,
                                  activation.id,
                                )
                              }
                              disabled={Boolean(
                                activation.deactivated_at || activation.revoked_at,
                              )}
                            >
                              Désactiver cet appareil
                            </button>
                          </div>
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
            </div>
          ) : (
            <div className="empty-state">
              Sélectionnez une licence pour afficher ses activations et son
              détail.
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
