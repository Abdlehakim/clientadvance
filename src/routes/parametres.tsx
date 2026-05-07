import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { ServerMode, SmtpProviderType } from "@/domain/types";
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
import {
  BACKEND_SYNC_DISABLED_MESSAGE,
  SMTP_PASSWORD_MASK,
  WHATSAPP_BACKEND_REQUIRED_MESSAGE,
  getNotificationDeliveryModeForServerMode,
} from "@/infrastructure/local/adminSettingsState";
import { getAdminSettings, getCurrentUser, updateAdminSettings } from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { toast } from "sonner";

export const Route = createFileRoute("/parametres")({ component: SettingsPage });

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = "587";

function SettingsPage() {
  useAppData();
  const mounted = useHasMounted();
  const user = mounted ? getCurrentUser() : null;
  const isAdmin = user?.role === "admin";
  const settings = mounted && isAdmin ? getAdminSettings() : null;
  const [email, setEmail] = useState("");
  const [whatsApp, setWhatsApp] = useState("");
  const [serverMode, setServerMode] = useState<ServerMode>("with-server");
  const [smtpProviderType, setSmtpProviderType] = useState<SmtpProviderType>("custom");
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
    setServerMode(settings.server_mode);
    setSmtpProviderType(settings.smtp_provider_type);
    setSmtpHost(
      settings.smtp_provider_type === "gmail" ? GMAIL_SMTP_HOST : settings.smtp_host,
    );
    setSmtpPort(
      settings.smtp_provider_type === "gmail"
        ? GMAIL_SMTP_PORT
        : String(settings.smtp_port),
    );
    setSmtpUsername(settings.smtp_username);
    setSmtpPassword("");
    setSmtpSecure(settings.smtp_provider_type === "gmail" ? true : settings.smtp_secure);
    setSmtpFromEmail(
      settings.smtp_provider_type === "gmail"
        ? settings.smtp_username.trim() || settings.smtp_from_email
        : settings.smtp_from_email,
    );
    setSmtpFromName(settings.smtp_from_name);
    setSmtpPasswordConfigured(settings.smtp_password_configured);
  }, [
    settings?.admin_email,
    settings?.admin_whatsapp,
    settings?.server_mode,
    settings?.smtp_provider_type,
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
            Accès refusé. Cette section est réservée à l'administrateur.
          </p>
        </Card>
      </AppLayout>
    );
  }

  if (!settings) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const deliveryMode = getNotificationDeliveryModeForServerMode(serverMode);
  const isWithoutServerMode = serverMode === "without-server";
  const isGmailProvider = smtpProviderType === "gmail";
  const isProfessionalProvider = smtpProviderType === "professional";
  const modeDescription = isWithoutServerMode
    ? "Fonctionnement local sans serveur, avec envoi email direct depuis l'application"
    : "Utiliser le serveur backend pour la synchronisation et les notifications";

  const applyGmailPreset = (username: string) => {
    setSmtpHost(GMAIL_SMTP_HOST);
    setSmtpPort(GMAIL_SMTP_PORT);
    setSmtpSecure(true);
    setSmtpFromEmail(username.trim());
  };

  const onSmtpProviderTypeChange = (value: SmtpProviderType) => {
    setSmtpProviderType(value);

    if (value === "gmail") {
      applyGmailPreset(smtpUsername);
    }
  };

  const onSmtpUsernameChange = (value: string) => {
    setSmtpUsername(value);

    if (isGmailProvider) {
      setSmtpFromEmail(value.trim());
    }
  };

  const save = async () => {
    setIsSaving(true);

    const nextSmtpHost = isGmailProvider ? GMAIL_SMTP_HOST : smtpHost;
    const nextSmtpPort = isGmailProvider ? 587 : Number(smtpPort) || 587;
    const nextSmtpSecure = isGmailProvider ? true : smtpSecure;
    const nextSmtpFromEmail = isGmailProvider ? smtpUsername.trim() : smtpFromEmail;

    try {
      await Promise.resolve(
        updateAdminSettings({
          admin_email: email,
          admin_whatsapp: whatsApp,
          server_mode: serverMode,
          notification_delivery_mode: deliveryMode,
          smtp_provider_type: smtpProviderType,
          smtp_host: nextSmtpHost,
          smtp_port: nextSmtpPort,
          smtp_username: smtpUsername,
          smtp_password: smtpPassword.trim() ? smtpPassword : undefined,
          smtp_secure: nextSmtpSecure,
          smtp_from_email: nextSmtpFromEmail,
          smtp_from_name: smtpFromName,
        }),
      );

      if (isGmailProvider) {
        applyGmailPreset(smtpUsername);
      }

      setSmtpPassword("");
      setSmtpPasswordConfigured(
        (previousValue) => previousValue || smtpPassword.trim().length > 0,
      );
      toast.success("Paramètres administrateur enregistrés");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec d'enregistrement des paramètres.",
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
          Configurer les destinataires, le mode de fonctionnement et l'email SMTP.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Envoi des notifications</h3>
            <SyncBadge status={isWithoutServerMode ? "local" : settings.sync_status} />
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
                {isWithoutServerMode ? (
                  <p className="text-xs text-muted-foreground">
                    {WHATSAPP_BACKEND_REQUIRED_MESSAGE}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label>Mode de fonctionnement</Label>
                <Select
                  value={serverMode}
                  onValueChange={(value) => setServerMode(value as ServerMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mode de fonctionnement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with-server">Avec serveur</SelectItem>
                    <SelectItem value="without-server">Sans serveur</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">{modeDescription}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Mode d'envoi</Label>
                <Select value={deliveryMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Mode d'envoi" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryMode === "backend" ? (
                      <SelectItem value="backend">Serveur backend</SelectItem>
                    ) : (
                      <SelectItem value="desktop-email">
                        Email direct depuis l'application
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div>
                <h4 className="font-medium">Paramètres email SMTP</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {WHATSAPP_BACKEND_REQUIRED_MESSAGE}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Type de compte email</Label>
                <Select
                  value={smtpProviderType}
                  onValueChange={(value) =>
                    onSmtpProviderTypeChange(value as SmtpProviderType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type de compte email" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="professional">
                      Email professionnel / domaine personnalisé
                    </SelectItem>
                    <SelectItem value="custom">Configuration personnalisée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isGmailProvider ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                  Pour Gmail, utilisez un mot de passe d'application, pas le mot de passe
                  normal du compte Gmail.
                </div>
              ) : null}

              {isProfessionalProvider ? (
                <div className="space-y-1 rounded-md border bg-background px-3 py-3 text-sm text-muted-foreground">
                  <p>
                    Utilisez les paramètres SMTP fournis par votre hébergeur email, par
                    exemple Hostinger, OVH, cPanel, Zoho, Outlook professionnel, etc.
                  </p>
                  <p>
                    Exemples : <code>smtp.yourdomain.com</code>,{" "}
                    <code>mail.yourdomain.com</code>, Port 587 TLS, Port 465 SSL.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Hôte SMTP</Label>
                  <Input
                    value={smtpHost}
                    onChange={(event) => setSmtpHost(event.target.value)}
                    placeholder="smtp.exemple.com"
                    readOnly={isGmailProvider}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Port SMTP</Label>
                  <Input
                    type="number"
                    value={smtpPort}
                    onChange={(event) => setSmtpPort(event.target.value)}
                    min={1}
                    readOnly={isGmailProvider}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Nom d'utilisateur SMTP</Label>
                  <Input
                    value={smtpUsername}
                    onChange={(event) => onSmtpUsernameChange(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Mot de passe SMTP</Label>
                  <Input
                    type="password"
                    value={smtpPassword}
                    onChange={(event) => setSmtpPassword(event.target.value)}
                    placeholder={smtpPasswordConfigured ? SMTP_PASSWORD_MASK : ""}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Email expéditeur</Label>
                  <Input
                    type="email"
                    value={smtpFromEmail}
                    onChange={(event) => setSmtpFromEmail(event.target.value)}
                    readOnly={isGmailProvider}
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
                    Active TLS / STARTTLS pour l'envoi direct.
                  </div>
                </div>
                <Switch
                  checked={smtpSecure}
                  onCheckedChange={(checked) => {
                    if (!isGmailProvider) {
                      setSmtpSecure(checked);
                    }
                  }}
                  disabled={isGmailProvider}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => void save()} disabled={isSaving}>
                {isSaving ? "Enregistrement..." : "Enregistrer les paramètres"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="font-semibold">Notifications en attente</h3>
          {isWithoutServerMode ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {BACKEND_SYNC_DISABLED_MESSAGE}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {WHATSAPP_BACKEND_REQUIRED_MESSAGE}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Les notifications email et WhatsApp sont gérées par le serveur backend.
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                La synchronisation avec le backend reste active dans ce mode.
              </p>
            </>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
