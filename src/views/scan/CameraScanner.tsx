"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

type Props = { paused: boolean; onScan: (text: string) => void };

/** Kamera belakang + decoder QR (@zxing/browser). Berhenti mendeteksi saat `paused`. */
export function CameraScanner({ paused, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current!,
          (result) => {
            if (result && !pausedRef.current) onScanRef.current(result.getText());
          },
        );
        if (cancelled) controls.stop();
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan kamera di browser, atau pakai mode Scanner USB."
            : !window.isSecureContext
              ? "Kamera butuh HTTPS (atau localhost). Jalankan npm run dev:https untuk uji di ponsel."
              : "Kamera tidak tersedia. Pakai mode Scanner USB.",
        );
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  if (error) return <div className="rounded-2xl bg-neutral-800 p-6 text-center text-lg text-white">{error}</div>;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} className="mx-auto aspect-square max-h-[42vh] w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className={`size-48 rounded-xl border-4 ${paused ? "border-neutral-500" : "border-white"}`} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-lg font-semibold text-white">
        {paused ? "Ditahan — tekan Mulai Scan Lagi" : "Arahkan QR ke kamera"}
      </div>
    </div>
  );
}
