import { CreditCard, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listClients, listPayments } from "../api/client";
import type { Client, Payment } from "../types";

interface DashboardState {
  clients: Client[];
  payments: Payment[];
  error: string;
  isLoading: boolean;
}

const moneyFormatter = new Intl.NumberFormat("fr-TN", {
  style: "currency",
  currency: "TND",
});

export function DashboardPage() {
  const [state, setState] = useState<DashboardState>({
    clients: [],
    payments: [],
    error: "",
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [clients, payments] = await Promise.all([
          listClients(),
          listPayments(),
        ]);

        if (isMounted) {
          setState({ clients, payments, error: "", isLoading: false });
        }
      } catch {
        if (isMounted) {
          setState((current) => ({
            ...current,
            error: "Donnees indisponibles",
            isLoading: false,
          }));
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const totalPayments = useMemo(
    () => state.payments.reduce((sum, payment) => sum + payment.montant, 0),
    [state.payments],
  );

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Vue client</p>
          <h1>Tableau de bord</h1>
        </div>
      </div>

      {state.error ? <div className="notice error">{state.error}</div> : null}

      <div className="metric-grid">
        <article className="metric-card">
          <Users aria-hidden="true" size={22} />
          <div>
            <span>Clients</span>
            <strong>{state.isLoading ? "..." : state.clients.length}</strong>
          </div>
        </article>
        <article className="metric-card">
          <CreditCard aria-hidden="true" size={22} />
          <div>
            <span>Paiements</span>
            <strong>{state.isLoading ? "..." : state.payments.length}</strong>
          </div>
        </article>
        <article className="metric-card total">
          <span>Total encaisse</span>
          <strong>
            {state.isLoading ? "..." : moneyFormatter.format(totalPayments)}
          </strong>
        </article>
      </div>

      <section className="data-section">
        <div className="section-heading">
          <h2>Derniers paiements</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Client</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              {state.payments.slice(0, 6).map((payment) => {
                const client = state.clients.find(
                  (item) => item.id === payment.client_id,
                );

                return (
                  <tr key={payment.id}>
                    <td>{payment.date_paiement}</td>
                    <td>{client?.nom_complet ?? payment.client_id}</td>
                    <td>{moneyFormatter.format(payment.montant)}</td>
                  </tr>
                );
              })}
              {!state.isLoading && state.payments.length === 0 ? (
                <tr>
                  <td colSpan={3}>Aucun paiement</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
