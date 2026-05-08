import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PaymentFormDialog } from "@/components/PaymentFormDialog";
import { PaymentNotificationStatusBadge } from "@/components/PaymentNotificationStatusBadge";
import { PaymentSyncStatusBadge } from "@/components/PaymentSyncStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHasMounted } from "@/hooks/useHasMounted";
import {
  formatDateFR,
  formatTND,
  getAdminSettings,
  getClientReferenceById,
  getLocalSyncStatus,
  getPaymentNotificationStatusMap,
  getPaymentNotificationStatuses,
  getPayments,
  getServerSyncStatus,
} from "@/lib/data";
import { useAppData } from "@/lib/useAppData";

export const Route = createFileRoute("/paiements")({ component: PaymentsPage });

function PaymentsPage() {
  useAppData();
  const mounted = useHasMounted();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const payments = getPayments().filter((payment) => {
    if (!q) {
      return true;
    }

    const client = getClientReferenceById(payment.client_id);
    return client?.nom_complet.toLowerCase().includes(q.toLowerCase());
  });
  const settings = getAdminSettings();
  const notificationStatusMap = getPaymentNotificationStatusMap();

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Paiements</h1>
          <p className="text-sm text-muted-foreground">
            Historique de tous les paiements
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un paiement
        </Button>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrer par client..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="pl-9"
            />
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
                <TableHead>{"Enregistr\u00e9 par"}</TableHead>
                <TableHead>Statut email</TableHead>
                <TableHead>Statut WhatsApp</TableHead>
                <TableHead>Synchronisation locale</TableHead>
                <TableHead>Synchronisation serveur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Aucun paiement.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => {
                  const client = getClientReferenceById(payment.client_id);
                  const localSyncStatus = getLocalSyncStatus(payment);
                  const notificationStatuses = getPaymentNotificationStatuses(
                    payment.id,
                    notificationStatusMap,
                  );
                  const serverSyncStatus = getServerSyncStatus(payment, settings);

                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {client?.nom_complet ?? "\u2014"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatTND(payment.montant)}
                      </TableCell>
                      <TableCell>{formatDateFR(payment.date_paiement)}</TableCell>
                      <TableCell>{payment.heure_paiement}</TableCell>
                      <TableCell>{payment.created_by}</TableCell>
                      <TableCell>
                        <PaymentNotificationStatusBadge status={notificationStatuses.email} />
                      </TableCell>
                      <TableCell>
                        <PaymentNotificationStatusBadge
                          status={notificationStatuses.whatsapp}
                        />
                      </TableCell>
                      <TableCell>
                        <PaymentSyncStatusBadge status={localSyncStatus} />
                      </TableCell>
                      <TableCell>
                        <PaymentSyncStatusBadge status={serverSyncStatus} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PaymentFormDialog open={open} onOpenChange={setOpen} />
    </AppLayout>
  );
}
