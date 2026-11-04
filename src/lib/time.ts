// Waktu disimpan UTC; ditampilkan dalam APP_TIMEZONE.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Jakarta";

/** Selisih (menit) zona waktu terhadap UTC pada saat `date`. */
function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** "2026-11-20" (tanggal lokal di `timeZone`) -> instant UTC pukul 00:00 lokal. */
export function localDateToUtc(ymd: string, timeZone = APP_TIMEZONE): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000);
}

/** Instant UTC -> "YYYY-MM-DD" di `timeZone` (untuk input type=date). */
export function utcToLocalDate(date: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

export function formatDate(date: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone, dateStyle: "long" }).format(date);
}

export function formatDateTime(date: Date, timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone, dateStyle: "medium", timeStyle: "medium" }).format(date);
}
