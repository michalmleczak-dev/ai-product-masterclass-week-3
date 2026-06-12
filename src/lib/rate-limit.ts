import { NextResponse } from "next/server";

/**
 * Prosty limiter zapytań: max MAX_REQUESTS na użytkownika w oknie WINDOW_MS.
 * Licznik trzymany w pamięci procesu — wystarcza dla pojedynczego serwera
 * (dev / mały deploy). Przy wielu instancjach każda liczy osobno, więc limit
 * jest "najlepszym wysiłkiem", nie twardą gwarancją.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const hits = new Map<string, number[]>();

export interface RateLimitOk {
  ok: true;
}

export interface RateLimitErr {
  ok: false;
  response: NextResponse;
}

export function checkRateLimit(userId: string): RateLimitOk | RateLimitErr {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const recent = (hits.get(userId) ?? []).filter((t) => t > windowStart);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((recent[0] + WINDOW_MS - now) / 1000);
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Too many requests — try again in ${retryAfterSec}s`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      ),
    };
  }

  recent.push(now);
  hits.set(userId, recent);

  // Sprzątanie: usuń wpisy użytkowników, których okno już minęło.
  if (hits.size > 1000) {
    hits.forEach((times, key) => {
      if (times.every((t) => t <= windowStart)) hits.delete(key);
    });
  }

  return { ok: true };
}
