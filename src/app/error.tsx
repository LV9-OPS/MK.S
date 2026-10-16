"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-lg py-16 text-center" role="alert">
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 text-muted">
        La page n&apos;a pas pu être chargée. Réessayez ; si le problème persiste, signalez-le à un administrateur
        {error.digest ? <> (référence : <code className="text-text">{error.digest}</code>)</> : null}.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">Réessayer</button>
        <Link href="/" className="btn-secondary">Accueil</Link>
      </div>
    </div>
  );
}
