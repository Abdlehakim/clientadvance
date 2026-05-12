import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/payments", label: "Paiements", icon: CreditCard },
  { to: "/settings", label: "Parametres", icon: Settings },
];

export function AppShell() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span className="brand-mark">GF</span>
          <div>
            <div className="brand-title">ClientAdvance</div>
            <div className="mode-badge">Avec serveur</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navigation principale">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive ? "nav-item active" : "nav-item"
                }
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="company-name">
              {user?.company_name || "Entreprise"}
            </div>
            <div className="user-line">
              {user?.name} · {user?.role === "admin" ? "Admin" : "Employe"}
            </div>
          </div>
          <button className="icon-button" type="button" onClick={signOut}>
            <LogOut aria-hidden="true" size={18} />
            <span>Quitter</span>
          </button>
        </header>

        <main className="page-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
