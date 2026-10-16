import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accès refusé" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-black text-accent">403</p>
      <h1 className="mt-4 text-2xl font-bold">Accès refusé</h1>
      <p className="mt-2 text-muted">Cette section est réservée aux administrateurs de l&apos;équipe.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">Retour à l&apos;accueil</Link>
        <Link href="/compte" className="btn-secondary">Mon compte</Link>
      </div>
    </div>
  );
}
