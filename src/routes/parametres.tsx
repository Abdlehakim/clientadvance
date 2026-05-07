import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { NotificationDeliveryMode } from "@/domain/types";
import { AppLayout } from "@/components/AppLayout";
import { SyncBadge } from "@/components/SyncBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useHasMounted } from "@/hooks/useHasMounted";
import { getAdminSettings, getCurrentUser, updateAdminSettings } from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { toast } from "sonner";

export const Route = createFileRoute("/parametres")({ component: SettingsPage });

function SettingsPage() {
  useAppData();
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const isAdmin = user?.role === "admin";
  const settings = mounted && isAdmin ? getAdminSettings() : null;
  const [email, setEmail] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<NotificationDeliveryMode>("hybrid-email");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!settings) {
      return;
    }

    setEmail(settings.admin_email);
    setWhatsApp(settings.admin_whatsapp);
    setDeliveryMode(settings.notification_delivery_mode);
    setSmtpHost(settings.smtp_host);
    setSmtpPort(String(settings.smtp_port));
    setSmtpUsername(settings.smtp_username);
    setSmtpPassword("");
    setSmtpSecure(settings.smtp_secure);
    setSmtpFromEmail(settings.smtp_from_email);
    setSmtpFromName(settings.smtp_from_name);
    setSmtpPasswordConfigured(settings.smtp_password_configured);
  }, [
    settings?.admin_email,
    settings?.admin_whatsapp,
    settings?.notification_delivery_mode,
    settings?.smtp_host,
    settings?.smtp_port,
    settings?.smtp_username,
    settings?.smtp_secure,
    settings?.smtp_from_email,
    settings?.smtp_from_name,
    settings?.smtp_password_configured,
  ]);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-lg p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Accès refusé</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accès refusé. Cette section est réservée à l’administrateur.
          </p>
        </Card>
      </AppLayout>
    );
  }

  if (!settings) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const save = async () => {
    setIsSaving(true);

    try {
      await Promise.resolve(
        updateAdminSettings({
          admin_email: email,
          admin_whatsapp: whatsApp,
          notification_delivery_mode: deliveryMode,
          smtp_host: smtpHost,
          smtp_port: Number(smtpPort) || 587,
          smtp_username: smtpUsername,
          smtp_password: smtpPassword.trim() ? smtpPassword : undefined,
          smtp_secure: smtpSecure,
          smtp_from_email: smtpFromEmail,
          smtp_from_name: smtpFromName,
        }),
      );
      setSmtpPassword("");
      setSmtpPasswordConfigured((previousValue) => previousValue || smtpPassword.trim().length > 0);
      toast.success("Paramètres SMTP enregistrés");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec d’enregistrement des paramètres SMTP.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Paramètres administrateur</h1>
        <p className="text-sm text-muted-foreground">
          Configurer les destinataires, le mode d’envoi et l’email SMTP.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Envoi des notifications</h3>
            <SyncBadge status={settings.sync_status} />
          </div>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email de réception des notifications</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Numéro WhatsApp de réception</Label>
                <Input
                  value={whatsApp}
                  onChange={(event) => setWhatsApp(event.target.value)}
                  placeholder="+216 ..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Mode d’envoi</Label>
                <Select
                  value={deliveryMode}
                  onValueChange={(value) =>
                    setDeliveryMode(value as NotificationDeliveryMode)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mode d’envoi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backend">Serveur backend</SelectItem>
                    <SelectItem value="desktop-email">
                      Email direct depuis l’application
                    </SelectItem>
                    <SelectItem value="hybrid-email">
                      Hybride : serveur puis email direct
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <h4 className="font-medium">Paramètres email SMTP</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les notifications WhatsApp nécessitent le serveur backend.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Hôte SMTP</Label>
                  <Input
                    value={smtpHost}
                    onChange={(event) => setSmtpHost(event.target.value)}
                    placeholder="smtp.exemple.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Port SMTP</Label>
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(event) => setSmtpPort(event.target.value)}
                    min={1}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Nom d’utilisateur SMTP</Label>
                  <Input
                    value={smtpUsername}
                    onChange={(event) => setSmtpUsername(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Mot de passe SMTP</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(event) => setSmtpPassword(event.target.value)}
                    placeholder={smtpPasswordConfigured ? "••••••••" : ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email expéditeur</Label>
                  <Input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(event) => setSmtpFromEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Nom expéditeur</Label>
                  <Input
                    value={smtpFromName}
                    onChange={(event) => setSmtpFromName(event.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Connexion SMTP sécurisée</div>
                  <div className="text-xs text-muted-foreground">
                    Active TLS / STARTTLS pour l’envoi direct.
                  </div>
                </div>
                <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => void save()} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer les paramètres SMTP"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="font-semibold">Notifications en attente</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            En mode hybride, le serveur backend reste prioritaire. Si le backend n’est pas
            disponible, l’application desktop peut envoyer directement les emails si SMTP est
            configuré.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Les notifications WhatsApp nécessitent le serveur backend.
          </p>
        </Card>
      </div>
    </AppLayout>
  );
}
