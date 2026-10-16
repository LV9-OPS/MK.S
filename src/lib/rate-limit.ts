// Limiteur en mémoire (fenêtre fixe). Suffisant pour une instance unique ;
// derrière plusieurs instances, remplacer par un stockage partagé (Redis…).
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterMs: b.resetAt - now };
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}
