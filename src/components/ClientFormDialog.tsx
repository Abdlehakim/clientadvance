import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Client } from "@/lib/types";
import { createClient, updateClient } from "@/lib/data";
import { toast } from "sonner";

export function ClientFormDialog({ open, onOpenChange, client }: { open: boolean; onOpenChange: (v: boolean) => void; client?: Client | null }) {
  const [form, setForm] = useState({ nom_complet: "", telephone: "", adresse: "", email: "", cin: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm(client ? { nom_complet: client.nom_complet, telephone: client.telephone, adresse: client.adresse, email: client.email, cin: client.cin } : { nom_complet: "", telephone: "", adresse: "", email: "", cin: "" });
    }
  }, [open, client]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!form.nom_complet.trim()) e.nom_complet = "Nom complet requis";
    if (!form.telephone.trim()) e.telephone = "Téléphone requis";
    if (form.cin && !/^\d+$/.test(form.cin)) e.cin = "Le CIN doit être numérique";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    setErrors(e);
    if (Object.keys(e).length) return;
    if (client) { updateClient(client.id, form); toast.success("Client modifié"); }
    else { createClient(form); toast.success("Client ajouté"); }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{client ? "Modifier le client" : "Ajouter un client"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {([
            ["nom_complet", "Nom complet *"],
            ["telephone", "Numéro de téléphone *"],
            ["adresse", "Adresse"],
            ["email", "Email"],
            ["cin", "Numéro CIN"],
          ] as const).map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={k}>{label}</Label>
              <Input id={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
