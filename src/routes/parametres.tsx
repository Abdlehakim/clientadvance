import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { getAdminSettings, getCurrentUser, updateAdminSettings } from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { SyncBadge } from "@/components/SyncBadge";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/parametres")({ component: SettingsPage });

function SettingsPage() {
  useAppData();
  const user = getCurrentUser();
  const settings = getAdminSettings();
  const [email, setEmail] = useState(settings.admin_email);
  const [wa, setWa] = useState(settings.admin_whatsapp);

  useEffect(() => { setEmail(settings.admin_email); setWa(settings.admin_whatsapp); }, [settings.admin_email, settings.admin_whatsapp]);

  if (user?.role !== "admin") {
    return (
      <AppLayout>
        <Card className="mx-auto max-w-lg p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Accès refusé</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cette section est réservée à l'administrateur.</p>
        </Card>
      </AppLayout>
    );
  }

  const save = () => {
    updateAdminSettings({ admin_email: email, admin_whatsapp: wa });
    toast.success("Paramètres enregistrés");
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Paramètres administrateur</h1>
        <p className="text-sm text-muted-foreground">Configurer les destinataires des notifications</p>
      </div>
      <Card className="max-w-2xl p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          <SyncBadge status={settings.sync_status} />
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email de réception des notifications</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Numéro WhatsApp de réception</Label>
            <Input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="+216 ..." />
          </div>
          <div className="pt-2">
            <Button onClick={save}>Enregistrer</Button>
          </div>
        </div>
      </Card>
    </AppLayout>
  );
}
