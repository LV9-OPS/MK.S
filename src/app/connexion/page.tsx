import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { safeInternalPath } from "@/lib/urls";
import { Flash } from "@/components/flash";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeInternalPath(sp.suite, "/");
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="mx-auto max-w-md">
      <Flash ok={sp.ok} />
      <div className="card p-6 sm:p-8">
        <h1 className="mb-1 text-2xl font-bold">Connexion membre</h1>
        <p className="mb-6 text-sm text-muted">
          {sp.suite ? "Cette page est réservée aux membres MK.S. Connectez-vous pour continuer." : "Accédez aux ressources et à vos statistiques."}
        </p>
        <LoginForm next={next} />
        <p className="mt-6 text-xs text-muted">
          Pas de compte ? Les comptes sont créés par un administrateur de l&apos;équipe. Mot de passe oublié : contactez un administrateur
          pour une réinitialisation.
        </p>
      </div>
    </div>
  );
}
