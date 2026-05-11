import { useEffect, useMemo, useState } from "react";
import { listClients, listPayments } from "../api/client";
import type { Client, Payment } from "../types";

const moneyFormatter = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
});

export function PaymentsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      try {
        const [nextClients, nextPayments] = await Promise.all([
          listClients(),
          listPayments(),
        ]);

        if (isMounted) {
          setClients(nextClients);
          setPayments(nextPayments);
          setError("");
        }
      } catch {
        if (isMounted) {
          setError("Paiements indisponibles");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.nom_complet])),
    [clients],
  );

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Encaissements</p>
          <h1>Paiements</h1>
        </div>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      <section className="data-section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>Client</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date_paiement}</td>
                  <td>{payment.heure_paiement}</td>
                  <td>{clientNames.get(payment.client_id) ?? payment.client_id}</td>
                  <td>{moneyFormatter.format(payment.montant)}</td>
                </tr>
              ))}
              {!isLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan={4}>Aucun paiement</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={4}>Chargement</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
