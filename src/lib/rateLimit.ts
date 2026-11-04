// Pembatas percobaan gagal (in-memory, per proses). Cukup untuk satu server venue;
// bila kelak multi-instance, pindahkan penyimpanan ke DB/Redis.
export type Limiter = {
  /** Sisa waktu blokir (ms) untuk `key`, 0 bila boleh mencoba. */
  blockedFor(key: string, now?: number): number;
  fail(key: string, now?: number): void;
  reset(key: string): void;
};

export function createLimiter(maxFailures: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  const recent = (key: string, now: number) => {
    const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length) hits.set(key, list);
    else hits.delete(key);
    return list;
  };
  return {
    blockedFor(key, now = Date.now()) {
      const list = recent(key, now);
      return list.length >= maxFailures ? windowMs - (now - list[0]) : 0;
    },
    fail(key, now = Date.now()) {
      hits.set(key, [...recent(key, now), now]);
    },
    reset(key) {
      hits.delete(key);
    },
  };
}

// Login: 5 gagal per 15 menit per (email + IP).
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const g = globalThis as unknown as { loginLimiter?: Limiter };
export const loginLimiter = (g.loginLimiter ??= createLimiter(LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS));
