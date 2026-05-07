import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from "@/infrastructure/auth/defaultAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, login, seedIfNeeded } from "@/lib/data";
import { initializeStorageDriver } from "@/services/appServices";

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

    void initializeStorageDriver()
      .catch((storageError) => {
        console.error("Local auth initialization failed.", storageError);
      })
      .then(() => {
        if (getCurrentUser()) {
          navigate({ to: "/dashboard", replace: true });
        }
      });
  }, [navigate]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await Promise.resolve(login(email.trim(), password));

      if (!user) {
        setError("Email ou mot de passe invalide.");
        return;
      }

      navigate({ to: "/dashboard" });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Identifiants incorrects ou serveur indisponible.",
      );
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
          <p className="mt-1 text-sm text-muted-foreground">Connectez-vous a votre espace</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email ou identifiant</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-6 rounded-lg border bg-muted/40 p-3 text-xs">
          <div className="mb-2 font-medium text-foreground">Compte de demonstration</div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => fill(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD)}
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-background"
            >
              <span>
                <span className="font-medium">Admin</span> - {DEFAULT_ADMIN_EMAIL}
              </span>
              <span className="text-muted-foreground">{DEFAULT_ADMIN_PASSWORD}</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
