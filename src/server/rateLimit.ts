const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Best-effort in-memory sliding-window rate limit. Serverless invocations
 * can land on a fresh process with an empty map, so this is not a hard
 * guarantee across all traffic — but it still meaningfully raises the cost
 * of abuse within any warm instance, and is a real backstop under
 * `next start`/`next dev` where the process is long-lived.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-nf-client-connection-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
