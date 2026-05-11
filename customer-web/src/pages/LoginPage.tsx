import { LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate(state?.from?.pathname ?? "/", { replace: true });
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "Connexion indisponible",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-block login-brand">
          <span className="brand-mark">GF</span>
          <div>
            <div className="brand-title">Gestion Facile</div>
            <div className="mode-badge">Avec serveur</div>
          </div>
        </div>

        <h1 id="login-title">Connexion client</h1>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Mot de passe
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            <LogIn aria-hidden="true" size={18} />
            <span>{isSubmitting ? "Connexion" : "Se connecter"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
