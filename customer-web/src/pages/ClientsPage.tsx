import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { listClients } from "../api/client";
import type { Client } from "../types";

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadClients() {
      try {
        const nextClients = await listClients();
        if (isMounted) {
          setClients(nextClients);
          setError("");
        }
      } catch {
        if (isMounted) {
          setError("Clients indisponibles");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadClients();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) =>
      [
        client.nom_complet,
        client.telephone,
        client.email,
        client.cin,
        client.adresse,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [clients, query]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Repertoire</p>
          <h1>Clients</h1>
        </div>
        <label className="search-box">
          <Search aria-hidden="true" size={17} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher"
            type="search"
            value={query}
          />
        </label>
      </div>

      {error ? <div className="notice error">{error}</div> : null}

      <section className="data-section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>Telephone</th>
                <th>Email</th>
                <th>CIN</th>
                <th>Mis a jour</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>{client.nom_complet}</td>
                  <td>{client.telephone || "-"}</td>
                  <td>{client.email || "-"}</td>
                  <td>{client.cin || "-"}</td>
                  <td>{new Date(client.updated_at).toLocaleDateString("fr-TN")}</td>
                </tr>
              ))}
              {!isLoading && filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5}>Aucun client</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Chargement</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
