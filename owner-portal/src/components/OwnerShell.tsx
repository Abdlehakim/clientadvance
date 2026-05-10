import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useOwnerPortal } from "./OwnerPortalProvider";

const navItems = [
  { to: "/dashboard", label: "Tableau de bord" },
  { to: "/companies", label: "Entreprises" },
  { to: "/admins", label: "Administrateurs" },
  { to: "/licenses", label: "Licences" },
  { to: "/devices", label: "Appareils" },
];

export function OwnerShell() {
  const navigate = useNavigate();
  const { disconnect } = useOwnerPortal();

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="brand">
          <div className="brand__kicker">{"Espace propriétaire"}</div>
          <h1 className="brand__title">{"Gestion logicielle propriétaire"}</h1>
          <p className="brand__subtitle">
            {"Portail web indépendant pour les entreprises, administrateurs, licences et appareils."}
          </p>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav__link active" : "nav__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell__footer">
          <p className="panel-note">
            {"Cette interface est réservée au propriétaire de l’application."}
          </p>
          <button
            className="button button--secondary button--full"
            type="button"
            onClick={() => {
              disconnect();
              navigate("/login", { replace: true });
            }}
          >
            {"Déconnexion"}
          </button>
        </div>
      </aside>

      <div className="shell__content">
        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
