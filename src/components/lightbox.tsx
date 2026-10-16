"use client";

import { useRef, useState } from "react";

/** Miniature cliquable ouvrant l'image en plein écran (Échap ou bouton pour fermer). */
export function Lightbox({ src, alt, thumbClassName }: { src: string; alt: string; thumbClassName?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`grid place-items-center bg-surface-2 p-8 text-sm text-muted ${thumbClassName ?? ""}`}>Capture indisponible (fichier introuvable).</div>;
  }
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className="group relative block w-full" aria-label={`Agrandir : ${alt}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={thumbClassName} onError={() => setFailed(true)} />
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white opacity-90 group-hover:opacity-100">⤢ Plein écran</span>
      </button>
      <dialog ref={ref} className="m-auto max-h-[95vh] max-w-[95vw] bg-transparent p-0" aria-label={alt} onClick={(e) => e.target === ref.current && ref.current?.close()}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain" />
          <div className="absolute right-2 top-2 flex gap-2">
            <a href={`${src}?telecharger=1`} className="btn-secondary btn-sm">Télécharger</a>
            <button type="button" className="btn-secondary btn-sm" onClick={() => ref.current?.close()} autoFocus>Fermer ✕</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
