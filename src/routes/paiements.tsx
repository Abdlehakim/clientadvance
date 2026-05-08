import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Printer, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { PaymentFormDialog } from "@/components/PaymentFormDialog";
import { PaymentNotificationStatusBadge } from "@/components/PaymentNotificationStatusBadge";
import { PaymentSyncStatusBadge } from "@/components/PaymentSyncStatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Client, Payment } from "@/domain/types";
import { useHasMounted } from "@/hooks/useHasMounted";
import {
  getAllPayments,
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
import { formatTunisianPhoneForDisplay } from "@/lib/tunisianPhone";
import { useAppData } from "@/lib/useAppData";
import type {
  LocalPaymentSyncDisplayStatus,
  ServerPaymentSyncDisplayStatus,
} from "@/services/appServices";
import type { PaymentNotificationDisplayStatus } from "@/services/paymentNotificationService";

export const Route = createFileRoute("/paiements")({ component: PaymentsPage });

const NOTIFICATION_STATUS_LABELS: Record<PaymentNotificationDisplayStatus, string> = {
  sent: "Envoyé",
  queued: "En attente",
  sending: "En cours",
  failed: "Échec",
  "not-created": "Non créé",
  "not-applicable": "Non applicable",
};

const SYNC_STATUS_LABELS: Record<
  LocalPaymentSyncDisplayStatus | ServerPaymentSyncDisplayStatus,
  string
> = {
  "saved-local": "Enregistré localement",
  "failed-local": "Échec local",
  synced: "Synchronisé",
  pending: "En attente",
  failed: "Échec",
  "not-applicable": "Non applicable",
};

interface PaymentReceiptData {
  clientName: string | null | undefined;
  clientPhone: string | null | undefined;
  clientEmail: string | null | undefined;
  clientCin: string | null | undefined;
  amountPaid: number;
  paymentDate: string;
  paymentTime: string;
  createdBy: string;
  totalPaidToDate: number;
  emailStatus: PaymentNotificationDisplayStatus;
  whatsappStatus: PaymentNotificationDisplayStatus;
  localSyncStatus: LocalPaymentSyncDisplayStatus;
  serverSyncStatus: ServerPaymentSyncDisplayStatus;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatReceiptValue(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "&#8212;";
  }

  const normalized = value.trim();
  return normalized.length > 0 ? escapeHtml(normalized) : "&#8212;";
}

function getClientTotalPaidToDate(clientId: string, payments: Payment[]) {
  return payments
    .filter((payment) => payment.client_id === clientId)
    .reduce((total, payment) => total + payment.montant, 0);
}

function buildReceiptHtml(receipt: PaymentReceiptData) {
  const fields = [
    ["Client", formatReceiptValue(receipt.clientName)],
    ["Téléphone", formatReceiptValue(receipt.clientPhone)],
    ["Email", formatReceiptValue(receipt.clientEmail)],
    ["CIN", formatReceiptValue(receipt.clientCin)],
    ["Montant payé", escapeHtml(formatTND(receipt.amountPaid))],
    ["Date", escapeHtml(formatDateFR(receipt.paymentDate))],
    ["Heure", formatReceiptValue(receipt.paymentTime)],
    ["Enregistré par", formatReceiptValue(receipt.createdBy)],
    [
      "Total payé par ce client à ce jour",
      escapeHtml(formatTND(receipt.totalPaidToDate)),
    ],
    ["Statut email", escapeHtml(NOTIFICATION_STATUS_LABELS[receipt.emailStatus])],
    [
      "Statut WhatsApp",
      escapeHtml(NOTIFICATION_STATUS_LABELS[receipt.whatsappStatus]),
    ],
    [
      "Synchronisation locale",
      escapeHtml(SYNC_STATUS_LABELS[receipt.localSyncStatus]),
    ],
    [
      "Synchronisation serveur",
      escapeHtml(SYNC_STATUS_LABELS[receipt.serverSyncStatus]),
    ],
  ];

  const rows = fields
    .map(
      ([label, value]) => `
        <tr>
          <th scope="row">${escapeHtml(label)}</th>
          <td>${value}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reçu de paiement</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 14mm;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
      }

      body {
        min-height: 100vh;
      }

      .receipt {
        width: 100%;
        max-width: 182mm;
        margin: 0 auto;
        border: 1px solid #000000;
        padding: 12mm;
      }

      .receipt-header {
        margin-bottom: 8mm;
        padding-bottom: 5mm;
        border-bottom: 1px solid #000000;
      }

      .receipt-title {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .receipt-subtitle {
        margin: 3mm 0 0;
        font-size: 12px;
      }

      .receipt-table {
        width: 100%;
        border-collapse: collapse;
      }

      .receipt-table th,
      .receipt-table td {
        padding: 3.25mm 0;
        border-bottom: 1px solid #d4d4d4;
        font-size: 12px;
        text-align: left;
        vertical-align: top;
      }

      .receipt-table th {
        width: 42%;
        padding-right: 6mm;
        font-weight: 700;
      }

      .receipt-footer {
        margin-top: 8mm;
        padding-top: 5mm;
        border-top: 1px solid #000000;
        font-size: 11px;
        text-align: center;
        letter-spacing: 0.03em;
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="receipt-header">
        <h1 class="receipt-title">Reçu de paiement</h1>
        <p class="receipt-subtitle">Gestion Clients &amp; Paiements</p>
      </header>
      <table class="receipt-table" aria-label="Détails du paiement">
        <tbody>
          ${rows}
        </tbody>
      </table>
      <footer class="receipt-footer">Gestion Clients &amp; Paiements</footer>
    </main>
  </body>
</html>`;
}

function printPaymentReceipt(receipt: PaymentReceiptData) {
  const printWindow = window.open("", "_blank", "width=900,height=1200");

  if (!printWindow) {
    return;
  }

  printWindow.onload = () => {
    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 150);
  };

  printWindow.onafterprint = () => {
    printWindow.close();
  };

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(receipt));
  printWindow.document.close();
}

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
  const allPayments = getAllPayments();

  const onPrintPayment = (
    payment: Payment,
    client: Client | null,
    emailStatus: PaymentNotificationDisplayStatus,
    whatsappStatus: PaymentNotificationDisplayStatus,
    localSyncStatus: LocalPaymentSyncDisplayStatus,
    serverSyncStatus: ServerPaymentSyncDisplayStatus,
  ) => {
    printPaymentReceipt({
      clientName: client?.nom_complet,
      clientPhone: client
        ? formatTunisianPhoneForDisplay(client.telephone) || client.telephone
        : null,
      clientEmail: client?.email,
      clientCin: client?.cin,
      amountPaid: payment.montant,
      paymentDate: payment.date_paiement,
      paymentTime: payment.heure_paiement,
      createdBy: payment.created_by,
      totalPaidToDate: getClientTotalPaidToDate(payment.client_id, allPayments),
      emailStatus,
      whatsappStatus,
      localSyncStatus,
      serverSyncStatus,
    });
  };

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
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
                      <TableCell className="text-right">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Imprimer le paiement"
                                aria-label="Imprimer le paiement"
                                onClick={() =>
                                  onPrintPayment(
                                    payment,
                                    client,
                                    notificationStatuses.email,
                                    notificationStatuses.whatsapp,
                                    localSyncStatus,
                                    serverSyncStatus,
                                  )
                                }
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Imprimer le paiement</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
