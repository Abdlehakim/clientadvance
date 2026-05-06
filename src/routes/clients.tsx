import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { deleteClient, getClients, getCurrentUser } from "@/lib/data";
import { useAppData } from "@/lib/useAppData";
import { ClientFormDialog } from "@/components/ClientFormDialog";
import { SyncBadge } from "@/components/SyncBadge";
import type { Client } from "@/lib/types";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useHasMounted } from "@/hooks/useHasMounted";

export const Route = createFileRoute("/clients")({ component: ClientsPage });

function ClientsPage() {
  useAppData();
  const mounted = useHasMounted();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDelete, setToDelete] = useState<Client | null>(null);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  const user = getCurrentUser();

  const clients = getClients().filter((c) => {
    const s = q.toLowerCase();
    return !s || c.nom_complet.toLowerCase().includes(s) || c.telephone.includes(s) || c.email.toLowerCase().includes(s) || c.cin.includes(s);
  });

  const onAdd = () => { setEditing(null); setOpen(true); };
  const onEdit = (c: Client) => { setEditing(c); setOpen(true); };
  const onDelete = () => {
    if (!toDelete) return;
    deleteClient(toDelete.id);
    toast.success("Client supprimé");
    setToDelete(null);
  };

  return (
    <AppLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Gérez votre base de clients</p>
        </div>
        <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> Ajouter un client</Button>
      </div>

      <Card className="p-4 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom complet</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CIN</TableHead>
                <TableHead>Synchronisation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Aucun client trouvé.</TableCell></TableRow>
              ) : clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nom_complet}</TableCell>
                  <TableCell>{c.telephone}</TableCell>
                  <TableCell>{c.email}</TableCell>
                  <TableCell>{c.cin}</TableCell>
                  <TableCell><SyncBadge status={c.sync_status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon"><Link to="/clients/$clientId" params={{ clientId: c.id }}><Eye className="h-4 w-4" /></Link></Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      {user?.role === "admin" && (
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ClientFormDialog open={open} onOpenChange={setOpen} client={editing} />
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Le client « {toDelete?.nom_complet} » sera supprimé.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
