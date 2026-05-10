import { useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { OwnerAccessStatusScreen } from "../components/OwnerAccessStatusScreen";
import { useOwnerPortal } from "../components/OwnerPortalProvider";

function getSafeRedirectTarget(redirectTo: string | null) {
  if (!redirectTo || !redirectTo.startsWith("/")) {
    return "/dashboard";
  }

  return redirectTo.startsWith("/login") ? "/dashboard" : redirectTo;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authStatus, signIn } = useOwnerPortal();
  const [ownerAdminKey, setOwnerAdminKey] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTarget = useMemo(
    () => getSafeRedirectTarget(searchParams.get("redirectTo")),
    [searchParams],
  );

  if (authStatus === "checking") {
    return (
      <OwnerAccessStatusScreen message={"Vérification de l’accès..."} />
    );
  }

  if (authStatus === "authenticated") {
    return <Navigate replace to={redirectTarget} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!ownerAdminKey.trim()) {
      setErrorMessage("Clé propriétaire invalide.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signIn(ownerAdminKey);
      navigate(redirectTarget, { replace: true });
    } catch {
      setErrorMessage("Clé propriétaire invalide.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-kicker">{"Espace propriétaire"}</div>
        <h1 className="auth-title">{"Espace propriétaire"}</h1>
        <p className="auth-subtitle">
          {"Connectez-vous pour gérer les entreprises, licences et administrateurs."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="owner-login-key">
              {"Clé propriétaire"}
            </label>
            <input
              id="owner-login-key"
              className="input"
              type="password"
              autoComplete="off"
              placeholder="Entrez votre clé propriétaire"
              value={ownerAdminKey}
              onChange={(event) => {
                setOwnerAdminKey(event.target.value);
                if (errorMessage) {
                  setErrorMessage("");
                }
              }}
            />
          </div>

          {errorMessage ? (
            <div className="message message--error">{errorMessage}</div>
          ) : null}

          <button
            className="button button--primary button--full"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="auth-note">
          {"Cette interface est réservée au propriétaire de l’application."}
        </p>
      </div>
    </div>
  );
}
