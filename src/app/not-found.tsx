import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-black text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n&apos;existe pas, a été retirée, ou vous n&apos;y avez pas accès.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/" className="btn-primary">Retour à l&apos;accueil</Link>
        <Link href="/meta" className="btn-secondary">Méta</Link>
        <Link href="/tournois" className="btn-secondary">Tournois</Link>
      </div>
    </div>
  );
}
