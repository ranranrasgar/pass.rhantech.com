import { CheckCircle2, CircleAlert, CircleX, WifiOff, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScanOutcome = {
  ok: boolean;
  result: "SUCCESS" | "UNKNOWN_QR" | "ALREADY_CHECKED_IN" | "INACTIVE" | "WRONG_EVENT" | "ERROR" | "NETWORK";
  message: string;
  manual?: boolean; // absen manual (tanpa gelang)
  guest?: { name: string; group: string; code: string | null };
  checkIn?: { gate: string; time: string };
  previousCheckIn?: { gate: string; time: string };
};

// Warna & aksi sesuai PRD: Status SELALU ditulis teks jelas.
const STYLE: Record<ScanOutcome["result"], { cardCls: string; badgeCls: string; action: string }> = {
  SUCCESS: {
    cardCls: "bg-emerald-600 text-white shadow-emerald-950/40",
    badgeCls: "bg-black/20 text-white",
    action: "Izinkan Masuk",
  },
  ALREADY_CHECKED_IN: {
    cardCls: "bg-amber-500 text-neutral-950 shadow-amber-950/40",
    badgeCls: "bg-black/15 text-neutral-950",
    action: "Jangan izinkan masuk ulang tanpa otorisasi",
  },
  UNKNOWN_QR: {
    cardCls: "bg-rose-700 text-white shadow-rose-950/40",
    badgeCls: "bg-black/20 text-white",
    action: "Scan ulang; periksa fisik gelang",
  },
  INACTIVE: {
    cardCls: "bg-rose-700 text-white shadow-rose-950/40",
    badgeCls: "bg-black/20 text-white",
    action: "Tiket tidak aktif — arahkan ke admin",
  },
  WRONG_EVENT: {
    cardCls: "bg-rose-700 text-white shadow-rose-950/40",
    badgeCls: "bg-black/20 text-white",
    action: "Gelang untuk event lain — tolak",
  },
  ERROR: {
    cardCls: "bg-rose-700 text-white shadow-rose-950/40",
    badgeCls: "bg-black/20 text-white",
    action: "Coba lagi; jangan anggap berhasil",
  },
  NETWORK: {
    cardCls: "bg-neutral-900 border-2 border-rose-500 text-white shadow-black",
    badgeCls: "bg-rose-950 text-rose-300",
    action: "Server tidak terjangkau — cek koneksi Wi-Fi",
  },
};

function StatusIcon({ result }: { result: ScanOutcome["result"] }) {
  const cls = "size-7 shrink-0";
  if (result === "SUCCESS") return <CheckCircle2 className={cls} aria-hidden />;
  if (result === "ALREADY_CHECKED_IN") return <CircleAlert className={cls} aria-hidden />;
  if (result === "NETWORK") return <WifiOff className={cls} aria-hidden />;
  return <CircleX className={cls} aria-hidden />;
}

export function ResultCard({
  outcome,
  onReset,
}: {
  outcome: ScanOutcome | null;
  onReset?: () => void;
}) {
  if (!outcome) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 py-5 px-4 text-center">
        <span className="size-2 rounded-full bg-neutral-600 mb-1.5" />
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Siap Memindai
        </span>
        <span className="text-[11px] text-neutral-500 mt-0.5">
          Scan QR gelang tamu untuk check-in
        </span>
      </div>
    );
  }

  const s = STYLE[outcome.result];
  const when = outcome.checkIn ?? outcome.previousCheckIn;
  const isDarkText = outcome.result === "ALREADY_CHECKED_IN";

  return (
    <div
      role="status"
      aria-live="assertive"
      className={cn(
        "rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between animate-in fade-in-50 zoom-in-95 duration-200",
        s.cardCls
      )}
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <StatusIcon result={outcome.result} />
          <div className="min-w-0">
            <div className="text-lg font-black tracking-wide leading-tight truncate">
              {outcome.message}
            </div>
            <div
              className={cn(
                "text-xs font-medium leading-normal line-clamp-1",
                isDarkText ? "text-neutral-800" : "text-white/85"
              )}
            >
              {outcome.manual && outcome.result === "SUCCESS" ? "Izinkan masuk — tercatat absen manual" : s.action}
            </div>
          </div>
        </div>

        {when?.time && (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-tight",
              s.badgeCls
            )}
          >
            {when.time}
          </span>
        )}
      </div>

      {/* Guest / Attendance Detail */}
      {(outcome.guest || when) && (
        <div
          className={cn(
            "mt-3 pt-2.5 border-t",
            isDarkText ? "border-neutral-950/15" : "border-white/15"
          )}
        >
          {outcome.guest && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-bold truncate tracking-tight">
                {outcome.guest.name}
              </span>
              {outcome.guest.code && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-bold",
                    s.badgeCls
                  )}
                >
                  #{outcome.guest.code}
                </span>
              )}
            </div>
          )}

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium mt-1",
              isDarkText ? "text-neutral-800" : "text-white/80"
            )}
          >
            {outcome.guest?.group && <span>{outcome.guest.group}</span>}
            {when?.gate && (
              <>
                <span>•</span>
                <span>
                  {outcome.previousCheckIn ? `Masuk di ${when.gate}` : when.gate}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action button inside card */}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className={cn(
            "mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold tracking-wider uppercase transition-all shadow-md active:scale-[0.98]",
            isDarkText
              ? "bg-neutral-950 text-white hover:bg-neutral-900"
              : "bg-white text-neutral-950 hover:bg-neutral-100"
          )}
        >
          <span>Scan Tamu Berikutnya</span>
          <ArrowRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
