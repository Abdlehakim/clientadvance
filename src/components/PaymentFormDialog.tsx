import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { createPayment, getAdminSettings, getClients } from "@/lib/data";
import { readNotificationDeliveryMode } from "@/infrastructure/local/adminSettingsState";
import { deliverQueuedNotifications } from "@/services/notificationDeliveryService";
import { toast } from "sonner";

function emailDeliverySuccessMessage(sentCount: number) {
  return sentCount === 1
    ? "Notification email envoyée"
    : `${sentCount} notifications email envoyées`;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  presetClientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetClientId?: string;
}) {
  const clients = getClients();
  const [clientId, setClientId] = useState("");
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const now = new Date();
      setClientId(presetClientId ?? "");
      setMontant("");
      setDate(now.toISOString().slice(0, 10));
      setHeure(now.toTimeString().slice(0, 5));
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, presetClientId]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!clientId) e.clientId = "Client requis";
    const m = parseFloat(montant);
    if (!montant || Number.isNaN(m) || m <= 0) e.montant = "Montant invalide";
    if (!date) e.date = "Date requise";
    if (!heure) e.heure = "Heure requise";
    setErrors(e);

    if (Object.keys(e).length) return;

    setIsSubmitting(true);

    try {
      const settings = getAdminSettings();
      const shouldUseDesktopEmail =
        readNotificationDeliveryMode(
          settings.notification_delivery_mode,
          settings.server_mode,
        ) === "desktop-email";

      await createPayment({
        client_id: clientId,
        montant: m,
        date_paiement: date,
        heure_paiement: heure,
      });

      toast.success("Paiement enregistré avec succès");

      if (shouldUseDesktopEmail) {
        const deliveryResult = await deliverQueuedNotifications({
          backendAvailable: false,
        });

        if (deliveryResult.sentCount > 0) {
          toast.success(emailDeliverySuccessMessage(deliveryResult.sentCount));
        }

        if (deliveryResult.failedCount > 0) {
          const reason = deliveryResult.errorMessages[0] ?? "Échec d'envoi email";
          toast.error(`Échec d'envoi email : ${reason}`);
        }
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Impossible d'enregistrer le paiement.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Ajouter un paiement</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nom_complet}</SelectItem>))}
              </SelectContent>
            </Select>
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Montant payé (TND) *</Label>
            <Input type="number" step="0.001" value={montant} onChange={(e) => setMontant(e.target.value)} />
            {errors.montant && <p className="text-xs text-destructive">{errors.montant}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Heure *</Label>
              <Input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
              {errors.heure && <p className="text-xs text-destructive">{errors.heure}</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Annuler</Button>
          <Button onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Enregistrer le paiement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
