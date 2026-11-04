import { CheckCircle2, CircleAlert, CircleX, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScanOutcome = {
  ok: boolean;
  result: "SUCCESS" | "UNKNOWN_QR" | "ALREADY_CHECKED_IN" | "INACTIVE" | "WRONG_EVENT" | "ERROR" | "NETWORK";
  message: string;
  guest?: { name: string; group: string; code: string | null };
  checkIn?: { gate: string; time: string };
  previousCheckIn?: { gate: string; time: string };
};

// Hijau = boleh masuk; oranye = sudah masuk; merah = tolak. Status SELALU ditulis teks, bukan warna saja.
const STYLE: Record<ScanOutcome["result"], { cls: string; action: string }> = {
  SUCCESS: { cls: "bg-green-600 text-white", action: "Izinkan masuk" },
  ALREADY_CHECKED_IN: { cls: "bg-orange-500 text-black", action: "Jangan izinkan masuk ulang tanpa otorisasi" },
  UNKNOWN_QR: { cls: "bg-red-700 text-white", action: "Scan ulang; periksa gelang" },
  INACTIVE: { cls: "bg-red-700 text-white", action: "Arahkan ke admin" },
  WRONG_EVENT: { cls: "bg-red-700 text-white", action: "Arahkan ke admin" },
  ERROR: { cls: "bg-red-700 text-white", action: "Coba lagi; jangan anggap berhasil" },
  NETWORK: { cls: "bg-neutral-800 text-white ring-4 ring-red-600", action: "Jangan anggap berhasil. Periksa jaringan lalu coba lagi" },
};

function Icon({ result }: { result: ScanOutcome["result"] }) {
  const cls = "size-16 shrink-0 md:size-20";
  if (result === "SUCCESS") return <CheckCircle2 className={cls} aria-hidden />;
  if (result === "ALREADY_CHECKED_IN") return <CircleAlert className={cls} aria-hidden />;
  if (result === "NETWORK") return <WifiOff className={cls} aria-hidden />;
  return <CircleX className={cls} aria-hidden />;
}

export function ResultCard({ outcome }: { outcome: ScanOutcome | null }) {
  if (!outcome) {
    return (
      <div className="rounded-2xl border-4 border-dashed border-neutral-600 p-6 text-center text-2xl font-bold text-neutral-300 md:text-3xl">
        MENUNGGU SCAN
      </div>
    );
  }
  const s = STYLE[outcome.result];
  const when = outcome.checkIn ?? outcome.previousCheckIn;
  return (
    <div role="status" aria-live="assertive" className={cn("rounded-2xl p-5 md:p-7", s.cls)}>
      <div className="flex items-center gap-4">
        <Icon result={outcome.result} />
        <div className="min-w-0">
          <div className="text-3xl font-black leading-tight md:text-5xl">{outcome.message}</div>
          <div className="text-lg font-semibold opacity-90 md:text-xl">{s.action}</div>
        </div>
      </div>
      {(outcome.guest || when) && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xl md:text-2xl">
          {outcome.guest && (
            <>
              <dt className="opacity-80">Nama</dt>
              <dd className="font-bold break-words">{outcome.guest.name}</dd>
              <dt className="opacity-80">Grup</dt>
              <dd className="font-semibold">{outcome.guest.group}</dd>
              {outcome.guest.code && (
                <>
                  <dt className="opacity-80">Kode</dt>
                  <dd className="font-semibold tabular-nums">{outcome.guest.code}</dd>
                </>
              )}
            </>
          )}
          {when && (
            <>
              <dt className="opacity-80">{outcome.previousCheckIn ? "Masuk di" : "Gate"}</dt>
              <dd className="font-semibold">{when.gate}</dd>
              <dt className="opacity-80">{outcome.previousCheckIn ? "Pada" : "Waktu"}</dt>
              <dd className="font-semibold tabular-nums">{when.time}</dd>
            </>
          )}
        </dl>
      )}
    </div>
  );
}
