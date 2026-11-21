"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Search, UserCheck } from "lucide-react";
import { apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";

// Absen manual: tamu tidak membawa gelang. Petugas mencari tamu, cek identitas, isi alasan.
// Server tetap menjamin satu check-in per tamu; hasil ditampilkan lewat ResultCard induk.

type Match = {
  id: number;
  name: string;
  group: string;
  code: string | null;
  status: "ACTIVE" | "CANCELLED";
  checkIn: { gate: string; time: string; manual: boolean } | null;
};

type Props = {
  gateId: number;
  disabled: boolean;
  onSubmit: (guestId: number, reason: string) => Promise<void>;
};

const REASONS = ["Gelang tertinggal", "Gelang hilang", "Gelang rusak / QR tidak terbaca"];
const OTHER = "Lainnya";

export function ManualCheckIn({ gateId, disabled, onSubmit }: Props) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Match | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return; // tampilan petunjuk ditentukan saat render
    let stale = false;
    const id = setTimeout(async () => {
      setSearching(true);
      const res = await apiSend<Match[]>(`/api/check-in/guests?gateId=${gateId}&q=${encodeURIComponent(term)}`, "GET");
      if (stale) return;
      setSearching(false);
      if (res.ok) {
        setMatches(res.data);
        setError(null);
      } else setError(res.error);
    }, 300);
    return () => {
      stale = true;
      clearTimeout(id);
    };
  }, [q, gateId]);

  if (picked) {
    return (
      <Confirm
        guest={picked}
        disabled={disabled}
        onBack={() => setPicked(null)}
        onConfirm={async (reason) => {
          await onSubmit(picked.id, reason);
          setPicked(null);
          setQ("");
        }}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-neutral-900 p-4 text-white">
      <span className="mb-2 block text-sm font-semibold">Absen manual — tamu tidak membawa gelang</span>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
        <input
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari nama atau kode tamu"
          placeholder="Cari nama atau kode tamu…"
          className="w-full rounded-lg border-2 border-neutral-700 bg-black py-2.5 pl-9 pr-3 text-base text-white outline-none focus:border-white"
        />
      </label>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {q.trim().length < 2 ? (
          <p className="py-6 text-center text-xs text-neutral-500">Ketik minimal 2 huruf nama atau angka kode tamu.</p>
        ) : error ? (
          <p className="py-6 text-center text-sm font-semibold text-rose-400">{error}</p>
        ) : searching && matches.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">Mencari…</p>
        ) : matches.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">Tamu tidak ditemukan di event ini. Arahkan ke meja bantuan.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {matches.map((m) => {
              const blocked = m.status !== "ACTIVE" || !!m.checkIn;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => setPicked(m)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{m.name}</span>
                      <span className="block truncate text-xs text-neutral-400">
                        {m.group}
                        {m.code && <> • #{m.code}</>}
                      </span>
                    </span>
                    <StatusTag m={m} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusTag({ m }: { m: Match }) {
  const base = "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold";
  if (m.status !== "ACTIVE") return <span className={cn(base, "bg-rose-950 text-rose-300")}>DIBATALKAN</span>;
  if (m.checkIn)
    return (
      <span className={cn(base, "bg-amber-500 text-neutral-950")}>
        SUDAH MASUK {m.checkIn.time} • {m.checkIn.gate}
      </span>
    );
  return <span className={cn(base, "bg-emerald-600 text-white")}>Pilih</span>;
}

function Confirm({
  guest,
  disabled,
  onBack,
  onConfirm,
}: {
  guest: Match;
  disabled: boolean;
  onBack: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [idChecked, setIdChecked] = useState(false);
  const reason = choice === OTHER ? other.trim() : choice;
  const ready = idChecked && reason.length >= 3 && !disabled;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-2xl bg-neutral-900 p-4 text-white">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1 text-xs font-semibold text-neutral-400 hover:text-white">
        <ArrowLeft className="size-3.5" /> Kembali ke pencarian
      </button>

      <div className="rounded-xl border border-neutral-700 bg-black/40 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-lg font-bold">{guest.name}</span>
          {guest.code && <span className="shrink-0 font-mono text-xs font-bold text-neutral-300">#{guest.code}</span>}
        </div>
        <span className="text-xs text-neutral-400">{guest.group}</span>
      </div>

      <span className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">Alasan</span>
      <div className="flex flex-wrap gap-1.5">
        {[...REASONS, OTHER].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setChoice(r)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
              choice === r ? "border-primary bg-primary text-neutral-950" : "border-neutral-700 text-neutral-300",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {choice === OTHER && (
        <input
          autoFocus
          value={other}
          maxLength={255}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Tulis alasan…"
          aria-label="Alasan lain"
          className="mt-2 w-full rounded-lg border-2 border-neutral-700 bg-black px-3 py-2 text-sm text-white outline-none focus:border-white"
        />
      )}

      <label className="mt-4 flex items-start gap-2.5 text-sm">
        <input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} className="mt-0.5 size-4 accent-emerald-500" />
        <span>Identitas tamu sudah saya cocokkan (KTP / undangan / konfirmasi penyelenggara).</span>
      </label>

      <button
        type="button"
        disabled={!ready}
        onClick={() => onConfirm(reason)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold uppercase tracking-wider text-white disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        <UserCheck className="size-4" /> Check-in Manual
      </button>
    </div>
  );
}
