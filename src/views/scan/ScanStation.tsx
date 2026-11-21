"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  Keyboard,
  Volume2,
  VolumeX,
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  UserSearch,
} from "lucide-react";
import { logout } from "@/Http/Controllers/AuthController";
import { cn } from "@/lib/utils";
import { CameraScanner } from "./CameraScanner";
import { UsbScanner } from "./UsbScanner";
import { ManualCheckIn } from "./ManualCheckIn";
import { ResultCard, type ScanOutcome } from "./ResultCard";
import { playScanSound } from "./scanSound";

type Props = {
  gate: { id: number; name: string; eventName: string; testMode: boolean };
  officerName: string;
  canLeave: boolean; // admin: kembali ke dashboard
};

const DEBOUNCE_MS = 2000;
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
  type Mode = "camera" | "usb" | "manual";
  const [mode, setMode] = useState<Mode>(() => {
    const m = pref("vp.scanMode", "camera");
    return m === "usb" || m === "manual" ? m : "camera";
  });
  const [muted, setMuted] = useState(() => pref("vp.muted", "0") === "1");
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const last = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  // Indikator koneksi server
  useEffect(() => {
    const ping = async () => {
      try {
        const r = await fetch("/api/check-in/ping", {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
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

  // Kirim ke server & tampilkan hasil (dipakai scan QR dan absen manual).
  const send = useCallback(
    async (url: string, payload: Record<string, unknown>) => {
      setBusy(true);

      let result: ScanOutcome;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, gateId: gate.id }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.result) {
          result = json as ScanOutcome;
          setOnline(true);
        } else {
          result = {
            ok: false,
            result: "ERROR",
            message: json?.error ?? `GAGAL (${res.status})`,
          };
        }
      } catch {
        setOnline(false);
        result = { ok: false, result: "NETWORK", message: "GAGAL TERHUBUNG" };
      }

      setOutcome(result);
      setBusy(false);
      if (!muted) playScanSound(result.result === "SUCCESS");
    },
    [gate.id, muted]
  );

  const submit = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      const now = Date.now();
      if (!token || busy) return;
      if (token === last.current.token && now - last.current.at < DEBOUNCE_MS) return;
      last.current = { token, at: now };
      await send("/api/check-in/scan", { token });
    },
    [busy, send]
  );

  const submitManual = useCallback(
    async (guestId: number, reason: string) => {
      if (busy) return;
      await send("/api/check-in/manual", { guestId, reason, identityChecked: true });
    },
    [busy, send]
  );

  const cameraPaused = busy || outcome !== null;

  function chooseMode(m: Mode) {
    setMode(m);
    savePref("vp.scanMode", m);
    setOutcome(null);
  }

  return (
    <div className="flex h-[100dvh] flex-col justify-between bg-black text-white select-none overflow-hidden">
      {/* Test Mode Notification (Sleek Banner) */}
      {gate.testMode && (
        <div className="bg-amber-400 py-1 px-3 text-center text-[11px] font-bold text-black tracking-wide shrink-0">
          MODE UJI AKTIF — Data scan tidak mempengaruhi acara sebenarnya
        </div>
      )}

      {/* Modern Compact Header */}
      <header className="flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/90 px-3.5 py-2.5 backdrop-blur-md shrink-0">
        {/* Gate & Event Name */}
        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white tracking-tight leading-none">
              {gate.name}
            </span>
            <div
              className={cn(
                "size-2 rounded-full shrink-0",
                online ? "bg-emerald-400" : "bg-rose-500 animate-pulse"
              )}
              title={online ? "Terhubung ke server" : "Koneksi terputus"}
            />
          </div>
          <span className="text-[11px] text-neutral-400 truncate max-w-[150px] sm:max-w-[200px] mt-0.5 leading-tight">
            {gate.eventName}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Segmented Control */}
          <div className="flex items-center rounded-lg bg-neutral-800/90 p-0.5 border border-neutral-700/60">
            <button
              type="button"
              onClick={() => chooseMode("camera")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all",
                mode === "camera"
                  ? "bg-primary text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Kamera HP"
            >
              <Camera className="size-3.5" />
              <span className="hidden xs:inline">Kamera</span>
            </button>
            <button
              type="button"
              onClick={() => chooseMode("usb")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all",
                mode === "usb"
                  ? "bg-primary text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Scanner USB"
            >
              <Keyboard className="size-3.5" />
              <span className="hidden xs:inline">USB</span>
            </button>
            <button
              type="button"
              onClick={() => chooseMode("manual")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all",
                mode === "manual"
                  ? "bg-primary text-neutral-950 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
              title="Absen manual (tamu tidak membawa gelang)"
            >
              <UserSearch className="size-3.5" />
              <span className="hidden xs:inline">Manual</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              setMuted(!muted);
              savePref("vp.muted", muted ? "0" : "1");
            }}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg border transition-colors",
              muted
                ? "bg-neutral-800/50 border-neutral-700/40 text-neutral-500"
                : "bg-neutral-800 border-neutral-700 text-white"
            )}
            title={muted ? "Bunyi mati" : "Bunyi nyala"}
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>

          {/* Switch Gate */}
          <Link
            href="/scan"
            className="flex size-8 items-center justify-center rounded-lg border border-neutral-700/50 bg-neutral-800/60 text-neutral-400 hover:text-white transition-colors"
            title="Ganti Gate"
          >
            <ArrowLeftRight className="size-4" />
          </Link>

          {/* Back to Dashboard / Logout */}
          {canLeave ? (
            <Link
              href="/dashboard"
              className="flex size-8 items-center justify-center rounded-lg border border-neutral-700/50 bg-neutral-800/60 text-neutral-400 hover:text-white transition-colors"
              title="Dashboard"
            >
              <LayoutDashboard className="size-4" />
            </Link>
          ) : (
            <form action={logout}>
              <button
                type="submit"
                className="flex size-8 items-center justify-center rounded-lg border border-neutral-700/50 bg-neutral-800/60 text-neutral-400 hover:text-rose-400 transition-colors"
                title="Keluar"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Main Scanner & Result Area (Zero-Scroll Optimized) */}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between p-3 sm:p-4 gap-3 overflow-hidden">
        {/* Scanner Viewport */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          {mode === "camera" ? (
            <CameraScanner
              paused={cameraPaused}
              onScan={submit}
              onResume={() => setOutcome(null)}
            />
          ) : mode === "usb" ? (
            <UsbScanner disabled={busy} onScan={submit} />
          ) : (
            <ManualCheckIn gateId={gate.id} disabled={busy} onSubmit={submitManual} />
          )}
        </div>

        {/* Validating Spinner / Result Card (mode manual: hanya saat ada hasil) */}
        <div className={cn("shrink-0", mode === "manual" && !busy && !outcome && "hidden")}>
          {busy ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 py-5 px-4 text-center">
              <span className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-base font-bold tracking-wider text-white uppercase">
                Memvalidasi...
              </span>
            </div>
          ) : (
            <ResultCard outcome={outcome} onReset={() => setOutcome(null)} />
          )}
        </div>

        {/* Minimal Bottom Info */}
        <footer className="flex items-center justify-between text-[11px] text-neutral-500 shrink-0 px-1 pt-1">
          <span>Petugas: <strong className="text-neutral-400 font-semibold">{officerName}</strong></span>
          {!online && (
            <span className="text-rose-400 font-semibold">● Tidak ada jaringan</span>
          )}
          <span>VenuePass</span>
        </footer>
      </main>
    </div>
  );
}
