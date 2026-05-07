import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import {
  getClientReferenceById,
  getPayments,
  formatTND,
  formatDateFR,
} from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { SyncBadge } from "@/components/SyncBadge";
import { Plus, Search } from "lucide-react";
import { PaymentFormDialog } from "@/components/PaymentFormDialog";
import { useHasMounted } from "@/hooks/useHasMounted";

export const Route = createFileRoute("/paiements")({ component: PaymentsPage });

function PaymentsPage() {
  useAppData();
  const mounted = useHasMounted();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const payments = getPayments().filter((p) => {
    if (!q) return true;
    const c = getClientReferenceById(p.client_id);
    return c?.nom_complet.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
          <p className="text-sm text-muted-foreground">Historique de tous les paiements</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Ajouter un paiement</Button>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Filtrer par client..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Heure</TableHead>
                <TableHead>Enregistré par</TableHead>
                <TableHead>Synchronisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun paiement.</TableCell></TableRow>
              ) : payments.map((p) => {
                const c = getClientReferenceById(p.client_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{c?.nom_complet ?? "—"}</TableCell>
                    <TableCell className="font-semibold">{formatTND(p.montant)}</TableCell>
                    <TableCell>{formatDateFR(p.date_paiement)}</TableCell>
                    <TableCell>{p.heure_paiement}</TableCell>
                    <TableCell>{p.created_by}</TableCell>
                    <TableCell><SyncBadge status={p.sync_status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PaymentFormDialog open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
