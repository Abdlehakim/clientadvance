import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { createPayment, getClients } from "@/lib/data";
import { toast } from "sonner";

export function PaymentFormDialog({ open, onOpenChange, presetClientId }: { open: boolean; onOpenChange: (v: boolean) => void; presetClientId?: string }) {
  const clients = getClients();
  const [clientId, setClientId] = useState("");
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      const now = new Date();
      setClientId(presetClientId ?? "");
      setMontant("");
      setDate(now.toISOString().slice(0, 10));
      setHeure(now.toTimeString().slice(0, 5));
      setErrors({});
    }
  }, [open, presetClientId]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!clientId) e.clientId = "Client requis";
    const m = parseFloat(montant);
    if (!montant || isNaN(m) || m <= 0) e.montant = "Montant invalide";
    if (!date) e.date = "Date requise";
    if (!heure) e.heure = "Heure requise";
    setErrors(e);
    if (Object.keys(e).length) return;
    createPayment({ client_id: clientId, montant: m, date_paiement: date, heure_paiement: heure });
    toast.success("Paiement enregistré avec succès");
    onOpenChange(false);
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Enregistrer le paiement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
