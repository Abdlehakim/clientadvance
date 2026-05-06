import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  ScrollText,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getCurrentUser,
  getLastSync,
  getNotifications,
  getPendingCount,
  isOnline,
  logout,
  syncPendingData,
  formatDateTimeFR,
} from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { useHasMounted } from "@/hooks/useHasMounted";

const allItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, admin: false },
  { to: "/clients", label: "Clients", icon: Users, admin: false },
  { to: "/paiements", label: "Paiements", icon: CreditCard, admin: false },
  { to: "/parametres", label: "Paramètres administrateur", icon: Settings, admin: true },
  { to: "/journal", label: "Journal des activités", icon: ScrollText, admin: true },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  useAppData();
  const mounted = useHasMounted();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    if (!getCurrentUser()) navigate({ to: "/" });
  }, [mounted, navigate]);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const user = getCurrentUser();

  if (!user) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const items = allItems.filter((item) => !item.admin || user.role === "admin");
  const online = isOnline();
  const pending = getPendingCount();
  const lastSync = getLastSync();
  const notifications = getNotifications();

  const onSync = async () => {
    try {
      const result = await Promise.resolve(syncPendingData());
      if (!result.ok) {
        toast.error("Impossible de synchroniser : hors ligne");
        return;
      }
      toast.success(`Synchronisation terminée (${result.synced} éléments)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synchronisation impossible. Serveur indisponible.");
    }
  };

  const onLogout = () => {
    void Promise.resolve(logout());
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="flex w-64 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary font-bold text-sidebar-primary-foreground">G</div>
          <div>
            <div className="text-sm font-semibold leading-tight">Gestion Clients</div>
            <div className="text-xs leading-tight opacity-70">& Paiements</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2 text-xs">
            <div className="font-medium">{user.name}</div>
            <div className="capitalize opacity-60">{user.role}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={online ? "border-success/40 bg-success/10 text-[oklch(0.35_0.1_150)]" : "border-destructive/40 bg-destructive/10 text-destructive"}
            >
              {online ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {online ? "Connecté" : "Hors ligne"}
            </Badge>
            {pending > 0 && (
              <Badge variant="outline" className="border-warning/40 bg-warning/15 text-warning-foreground">
                {pending} en attente
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              Dernière sync : {lastSync ? `${formatDateTimeFR(lastSync).date} ${formatDateTimeFR(lastSync).time}` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNotifOpen(true)} className="relative">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {notifications.length}
                </span>
              )}
            </Button>
            <Button size="sm" onClick={() => void onSync()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Synchroniser maintenant
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>

      <NotificationsDrawer open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}
