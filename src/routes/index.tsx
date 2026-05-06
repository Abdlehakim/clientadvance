import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { getCurrentUser, login, seedIfNeeded } from "@/lib/data";
import { LockKeyhole } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    seedIfNeeded();
    if (getCurrentUser()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await Promise.resolve(login(email.trim(), password));
      if (!user) {
        setError("Identifiants incorrects ou serveur indisponible.");
        return;
      }
      navigate({ to: "/dashboard" });
    } catch {
      setError("Identifiants incorrects ou serveur indisponible.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fill = (nextEmail: string, nextPassword: string) => {
    setEmail(nextEmail);
    setPassword(nextPassword);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
      <Card className="w-full max-w-md p-8 shadow-elevated">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion Clients & Paiements</h1>
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous à votre espace</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email ou identifiant</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
        <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="mb-2 font-medium text-foreground">Comptes de démonstration</div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => fill("admin@demo.com", "admin123")}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-background"
            >
              <span><span className="font-medium">Admin</span> · admin@demo.com</span>
              <span className="text-muted-foreground">admin123</span>
            </button>
            <button
              type="button"
              onClick={() => fill("employe@demo.com", "employe123")}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-background"
            >
              <span><span className="font-medium">Employé</span> · employe@demo.com</span>
              <span className="text-muted-foreground">employe123</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
