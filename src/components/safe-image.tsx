"use client";

import { useState } from "react";

/** Image servie par une route protégée ; affiche un repli lisible si elle ne peut pas être chargée. */
export function SafeImage({ src, alt, className, fallback }: { src: string; alt: string; className?: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`grid place-items-center bg-surface-2 text-center text-xs text-muted ${className ?? ""}`}>
        {fallback}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />;
}
