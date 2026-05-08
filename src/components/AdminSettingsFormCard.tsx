import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type {
  AdminSettings,
  AdminSettingsUpdateInput,
  ServerMode,
  SmtpProviderType,
} from "@/domain/types";
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
import {
  normalizeSmtpPasswordValue,
  WHATSAPP_BACKEND_REQUIRED_MESSAGE,
  getNotificationDeliveryModeForServerMode,
} from "@/infrastructure/local/adminSettingsState";
import { getStoredSmtpPassword } from "@/infrastructure/local/smtpPasswordStorage";
import { testAdminSmtpEmail, updateAdminSettings } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GMAIL_SMTP_HOST = "smtp.gmail.com";
const GMAIL_SMTP_PORT = "587";
const MISSING_SMTP_TEST_MESSAGE =
  "Paramètres SMTP manquants. Veuillez les configurer avant de tester l'envoi.";

interface AdminSettingsFormCardProps {
  settings: AdminSettings;
  className?: string;
  title?: string;
  submitLabel?: string;
  successMessage?: string;
  showSyncBadge?: boolean;
  showSmtpTestButton?: boolean;
  showSmtpPasswordToggle?: boolean;
  extraPatch?: AdminSettingsUpdateInput;
  onSaved?: () => void;
}

export function AdminSettingsFormCard({
  settings,
  className,
  title = "Envoi des notifications",
  submitLabel = "Enregistrer les paramètres",
  successMessage = "Paramètres administrateur enregistrés",
  showSyncBadge = true,
  showSmtpTestButton = false,
  showSmtpPasswordToggle = false,
  extraPatch,
  onSaved,
}: AdminSettingsFormCardProps) {
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
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isSmtpPasswordVisible, setIsSmtpPasswordVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const hydrateStoredSmtpPassword = async () => {
      try {
        const storedSmtpPassword = normalizeSmtpPasswordValue(
          await getStoredSmtpPassword(),
        );

        if (cancelled) {
          return;
        }

        setSmtpPassword(storedSmtpPassword);
        setSmtpPasswordConfigured(storedSmtpPassword.length > 0);
      } catch {
        if (cancelled) {
          return;
        }

        setSmtpPassword("");
        setSmtpPasswordConfigured(false);
      }
    };

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
    setSmtpPasswordConfigured(false);
    setSmtpSecure(settings.smtp_provider_type === "gmail" ? false : settings.smtp_secure);
    setSmtpFromEmail(
      settings.smtp_provider_type === "gmail"
        ? settings.smtp_username.trim() || settings.smtp_from_email
        : settings.smtp_from_email,
    );
    setSmtpFromName(settings.smtp_from_name);
    setIsSmtpPasswordVisible(false);
    void hydrateStoredSmtpPassword();

    return () => {
      cancelled = true;
    };
  }, [
    settings.admin_email,
    settings.admin_whatsapp,
    settings.server_mode,
    settings.smtp_provider_type,
    settings.smtp_host,
    settings.smtp_port,
    settings.smtp_username,
    settings.smtp_secure,
    settings.smtp_from_email,
    settings.smtp_from_name,
  ]);

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
    setSmtpSecure(false);
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

  const getCurrentSmtpValues = () => {
    const nextEmail = email.trim();
    const nextSmtpHost = (isGmailProvider ? GMAIL_SMTP_HOST : smtpHost).trim();
    const nextSmtpPort = isGmailProvider ? 587 : Number(smtpPort);
    const nextSmtpUsername = smtpUsername.trim();
    const nextSmtpPassword = normalizeSmtpPasswordValue(smtpPassword);
    const nextSmtpFromEmail = isGmailProvider
      ? nextSmtpUsername
      : smtpFromEmail.trim();
    const smtpPasswordAvailable =
      nextSmtpPassword.length > 0 || smtpPasswordConfigured;

    return {
      nextEmail,
      nextSmtpHost,
      nextSmtpPort,
      nextSmtpUsername,
      nextSmtpPassword,
      nextSmtpFromEmail,
      smtpPasswordAvailable,
    };
  };

  const validate = () => {
    const {
      nextEmail,
      nextSmtpHost,
      nextSmtpPort,
      nextSmtpUsername,
      nextSmtpFromEmail,
      smtpPasswordAvailable,
    } = getCurrentSmtpValues();
    const smtpIsValid =
      !isWithoutServerMode ||
      (nextSmtpHost.length > 0 &&
        Number.isFinite(nextSmtpPort) &&
        nextSmtpPort > 0 &&
        nextSmtpUsername.length > 0 &&
        nextSmtpFromEmail.length > 0 &&
        smtpPasswordAvailable);

    if (!nextEmail || !smtpIsValid) {
      toast.error("Veuillez compléter les champs obligatoires.");
      return null;
    }

    return {
      nextEmail,
      nextSmtpHost,
      nextSmtpPort,
      nextSmtpUsername,
      nextSmtpPassword: normalizeSmtpPasswordValue(smtpPassword),
      nextSmtpFromEmail,
    };
  };

  const toggleSmtpPasswordVisibility = () => {
    setIsSmtpPasswordVisible((previousValue) => !previousValue);
  };

  const testEmail = async () => {
    const {
      nextEmail,
      nextSmtpHost,
      nextSmtpPort,
      nextSmtpUsername,
      nextSmtpPassword,
      nextSmtpFromEmail,
      smtpPasswordAvailable,
    } = getCurrentSmtpValues();

    const smtpIsValid =
      nextEmail.length > 0 &&
      nextSmtpHost.length > 0 &&
      Number.isFinite(nextSmtpPort) &&
      nextSmtpPort > 0 &&
      nextSmtpUsername.length > 0 &&
      nextSmtpFromEmail.length > 0 &&
      smtpPasswordAvailable;

    if (!smtpIsValid) {
      toast.error(MISSING_SMTP_TEST_MESSAGE);
      return;
    }

    setIsTestingEmail(true);

    try {
      await testAdminSmtpEmail({
        recipientEmail: nextEmail,
        smtpProviderType,
        smtpHost: nextSmtpHost,
        smtpPort: nextSmtpPort,
        smtpUsername: nextSmtpUsername,
        smtpPassword: nextSmtpPassword,
        smtpSecure: isGmailProvider ? false : smtpSecure,
        smtpFromEmail: nextSmtpFromEmail,
        smtpFromName: smtpFromName.trim(),
      });
      toast.success("Email de test envoyé avec succès.");
    } catch (error) {
      toast.error(
        `Échec du test SMTP : ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      );
    } finally {
      setIsTestingEmail(false);
    }
  };

  const save = async () => {
    const validated = validate();

    if (!validated) {
      return;
    }

    setIsSaving(true);

    try {
      await Promise.resolve(
        updateAdminSettings({
          admin_email: validated.nextEmail,
          admin_whatsapp: whatsApp.trim(),
          server_mode: serverMode,
          notification_delivery_mode: deliveryMode,
          smtp_provider_type: smtpProviderType,
          smtp_host: validated.nextSmtpHost,
          smtp_port: validated.nextSmtpPort,
          smtp_username: validated.nextSmtpUsername,
          smtp_password: validated.nextSmtpPassword || undefined,
          smtp_secure: isGmailProvider ? false : smtpSecure,
          smtp_from_email: validated.nextSmtpFromEmail,
          smtp_from_name: smtpFromName.trim(),
          ...extraPatch,
        }),
      );

      if (isGmailProvider) {
        applyGmailPreset(smtpUsername);
      }

      const persistedSmtpPassword =
        validated.nextSmtpPassword ||
        normalizeSmtpPasswordValue(await getStoredSmtpPassword());
      setSmtpPassword(persistedSmtpPassword);
      setIsSmtpPasswordVisible(false);
      setSmtpPasswordConfigured(persistedSmtpPassword.length > 0);
      toast.success(successMessage);
      onSaved?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Échec d'enregistrement des paramètres.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("p-6 shadow-card", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {showSyncBadge ? (
          <SyncBadge status={isWithoutServerMode ? "local" : settings.sync_status} />
        ) : null}
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
            <p className="text-xs text-muted-foreground">
              {WHATSAPP_BACKEND_REQUIRED_MESSAGE}
            </p>
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
            <Select value={deliveryMode} disabled>
              <SelectTrigger disabled>
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
              {isWithoutServerMode
                ? "Le mode sans serveur utilise l'envoi email direct depuis l'application."
                : "En mode avec serveur, ces paramètres restent disponibles si vous activez plus tard l'envoi direct."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Type de compte email</Label>
            <Select
              value={smtpProviderType}
              onValueChange={(value) => onSmtpProviderTypeChange(value as SmtpProviderType)}
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
              <div className="relative">
                <Input
                  type={isSmtpPasswordVisible ? "text" : "password"}
                  value={smtpPassword}
                  onChange={(event) => setSmtpPassword(event.target.value)}
                  className={showSmtpPasswordToggle ? "pr-10" : undefined}
                />
                {showSmtpPasswordToggle ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    aria-label={
                      isSmtpPasswordVisible
                        ? "Masquer le mot de passe SMTP"
                        : "Afficher le mot de passe SMTP"
                    }
                    onClick={toggleSmtpPasswordVisibility}
                  >
                    {isSmtpPasswordVisible ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
              </div>
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

        <div className="flex flex-wrap gap-2 pt-2">
          {showSmtpTestButton ? (
            <Button
              variant="outline"
              onClick={() => void testEmail()}
              disabled={isSaving || isTestingEmail}
            >
              {isTestingEmail ? "Test en cours..." : "Tester l’envoi email"}
            </Button>
          ) : null}

          <Button onClick={() => void save()} disabled={isSaving || isTestingEmail}>
            {isSaving ? "Enregistrement..." : submitLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
