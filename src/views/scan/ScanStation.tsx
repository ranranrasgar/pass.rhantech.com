"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Keyboard, Volume2, VolumeX } from "lucide-react";
import { logout } from "@/Http/Controllers/AuthController";
import { CameraScanner } from "./CameraScanner";
import { UsbScanner } from "./UsbScanner";
import { ResultCard, type ScanOutcome } from "./ResultCard";
import { playScanSound } from "./scanSound";

type Props = {
  gate: { id: number; name: string; eventName: string; testMode: boolean };
  officerName: string;
  canLeave: boolean; // admin: kembali ke dashboard
};

const DEBOUNCE_MS = 2000; // token sama dalam 2 dtk diabaikan (scanner USB sering kirim ganda)
const TIMEOUT_MS = 8000;
const pref = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const savePref = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

export function ScanStation({ gate, officerName, canLeave }: Props) {
  // Komponen ini hanya dirender di client (ScanStationClient, ssr: false) -> aman baca localStorage.
  const [mode, setMode] = useState<"camera" | "usb">(() => (pref("vp.scanMode", "usb") === "camera" ? "camera" : "usb"));
  const [muted, setMuted] = useState(() => pref("vp.muted", "0") === "1");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const last = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  // Indikator koneksi: ping server tiap 15 dtk + event online/offline browser.
  useEffect(() => {
    const ping = async () => {
      try {
        const r = await fetch("/api/check-in/ping", { cache: "no-store", signal: AbortSignal.timeout(5000) });
        setOnline(r.ok);
      } catch {
        setOnline(false);
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    const on = () => ping();
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const submit = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      const now = Date.now();
      if (!token || busy) return;
      if (token === last.current.token && now - last.current.at < DEBOUNCE_MS) return;
      last.current = { token, at: now };
      setBusy(true);
      let result: ScanOutcome;
      try {
        const res = await fetch("/api/check-in/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, gateId: gate.id }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.result) {
          result = json as ScanOutcome;
          setOnline(true);
        } else {
          // 401/403/409 dll: tampilkan pesan server; tidak pernah dianggap berhasil.
          result = { ok: false, result: "ERROR", message: json?.error ?? `GAGAL (${res.status})` };
        }
      } catch {
        // TC-11: koneksi putus / timeout -> GAGAL TERHUBUNG, tidak pernah sukses.
        setOnline(false);
        result = { ok: false, result: "NETWORK", message: "GAGAL TERHUBUNG" };
      }
      setOutcome(result);
      setBusy(false);
      if (!muted) playScanSound(result.result === "SUCCESS");
    },
    [busy, gate.id, muted],
  );

  // Kamera ditahan setelah ada hasil sampai "Mulai Scan Lagi".
  const cameraPaused = busy || outcome !== null;

  function chooseMode(m: "camera" | "usb") {
    setMode(m);
    savePref("vp.scanMode", m);
    setOutcome(null);
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <div>
          <div className="text-xs font-bold tracking-widest text-primary">VENUEPASS</div>
          <div className="text-lg font-bold leading-tight md:text-xl">{gate.eventName}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-black md:text-2xl">{gate.name}</div>
          <div className="text-sm text-neutral-300">Petugas: {officerName}</div>
        </div>
      </header>

      {gate.testMode && (
        <div className="bg-amber-400 px-4 py-2 text-center text-base font-black text-black">
          MODE UJI — check-in ini hanya uji & akan dihapus sebelum acara
        </div>
      )}
      <div
        role="status"
        className={`px-4 py-1.5 text-center text-sm font-bold ${online ? "bg-green-900 text-green-100" : "bg-red-600 text-white"}`}
      >
        {online ? "● Terhubung ke server" : "● KONEKSI TERPUTUS — scan tidak bisa divalidasi"}
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(["usb", "camera"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => chooseMode(m)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-base font-bold ${mode === m ? "bg-primary text-primary-foreground" : "bg-neutral-800"}`}
            >
              {m === "usb" ? <Keyboard className="size-5" /> : <Camera className="size-5" />}
              {m === "usb" ? "Scanner USB" : "Kamera"}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMuted(!muted);
              savePref("vp.muted", muted ? "0" : "1");
            }}
            className="ml-auto flex items-center gap-2 rounded-xl bg-neutral-800 px-4 py-2 font-bold"
            aria-pressed={muted}
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            {muted ? "Bunyi mati" : "Bunyi nyala"}
          </button>
        </div>

        {mode === "camera" ? <CameraScanner paused={cameraPaused} onScan={submit} /> : <UsbScanner disabled={busy} onScan={submit} />}

        {busy ? <div className="rounded-2xl bg-neutral-800 p-6 text-center text-3xl font-black">MEMVALIDASI…</div> : <ResultCard outcome={outcome} />}

        <button
          type="button"
          onClick={() => setOutcome(null)}
          className="rounded-2xl bg-white py-4 text-2xl font-black text-black active:translate-y-px"
        >
          Mulai Scan Lagi
        </button>

        <div className="mt-auto flex justify-between text-sm text-neutral-400">
          <Link href="/scan" className="underline">
            Ganti gate
          </Link>
          {canLeave ? (
            <Link href="/dashboard" className="underline">
              Kembali ke dashboard
            </Link>
          ) : (
            <form action={logout}>
              <button type="submit" className="underline">
                Keluar
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
