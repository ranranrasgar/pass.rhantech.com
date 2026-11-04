"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { RefreshCw, Zap, ZapOff } from "lucide-react";

type Props = {
  paused: boolean;
  onScan: (text: string) => void;
  onResume?: () => void;
};

/** Kamera belakang + decoder QR super responsif (@zxing/browser + @zxing/library). */
export function CameraScanner({ paused, onScan, onResume }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused;
  });

  useEffect(() => {
    let controls: IScannerControls | null = null;
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserQRCodeReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);

        // Optimasi performa & sensitivitas maksimal:
        const hints = new Map();
        // 1. Fokus 100% hanya pada QR Code (tidak membuang CPU mencari barcode lain)
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
        // 2. Mode TRY_HARDER untuk membaca QR kecil / miring / melengkung di gelang
        hints.set(DecodeHintType.TRY_HARDER, true);

        // 3. Interval scan ultra-cepat: 25ms (40x scan per detik vs default 150ms)
        const reader = new BrowserQRCodeReader(hints, { delayBetweenScanAttempts: 25 });

        // 4. Resolusi video HD + continuous autofocus untuk deteksi instan
        const videoConstraints: MediaTrackConstraints = {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 60, min: 30 },
          // @ts-expect-error advanced constraints for mobile browsers
          advanced: [{ focusMode: "continuous" }, { exposureMode: "continuous" }],
        };

        controls = await reader.decodeFromConstraints(
          { video: videoConstraints, audio: false },
          videoRef.current!,
          (result) => {
            if (result && !pausedRef.current) {
              onScanRef.current(result.getText());
            }
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        // Cek dukungan senter / flashlight
        try {
          const stream = videoRef.current?.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks()[0];
          if (track) {
            trackRef.current = track;
            const capabilities = typeof (track as unknown as { getCapabilities: () => Record<string, unknown> }).getCapabilities === "function"
              ? (track as unknown as { getCapabilities: () => Record<string, unknown> }).getCapabilities()
              : {};
            if ("torch" in capabilities) {
              setHasTorch(true);
            }
          }
        } catch {}
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Izin kamera ditolak. Izinkan kamera di browser, atau pakai mode Scanner USB."
            : !window.isSecureContext
              ? "Kamera butuh HTTPS (atau localhost). Buka lewat domain HTTPS."
              : "Kamera tidak tersedia. Pakai mode Scanner USB."
        );
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, []);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    try {
      const next = !torchOn;
      // @ts-expect-error torch constraint
      await trackRef.current.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {}
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 text-center text-sm text-neutral-300">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (paused && onResume) onResume();
      }}
      className={`group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950 shadow-2xl transition-all ${
        paused ? "cursor-pointer ring-2 ring-primary/40" : ""
      }`}
    >
      <video
        ref={videoRef}
        className="mx-auto aspect-[4/3] max-h-[34vh] w-full object-cover transition-opacity duration-200"
        style={{ opacity: paused ? 0.45 : 1 }}
        muted
        playsInline
      />

      {/* Frame reticle */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative size-44 sm:size-52">
          {/* 4 Corner brackets */}
          <div
            className={`absolute top-0 left-0 size-6 border-t-3 border-l-3 rounded-tl-md transition-colors duration-200 ${
              paused ? "border-neutral-500" : "border-primary"
            }`}
          />
          <div
            className={`absolute top-0 right-0 size-6 border-t-3 border-r-3 rounded-tr-md transition-colors duration-200 ${
              paused ? "border-neutral-500" : "border-primary"
            }`}
          />
          <div
            className={`absolute bottom-0 left-0 size-6 border-b-3 border-l-3 rounded-bl-md transition-colors duration-200 ${
              paused ? "border-neutral-500" : "border-primary"
            }`}
          />
          <div
            className={`absolute bottom-0 right-0 size-6 border-b-3 border-r-3 rounded-br-md transition-colors duration-200 ${
              paused ? "border-neutral-500" : "border-primary"
            }`}
          />

          {/* Scanning laser line animation */}
          {!paused && (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-90 animate-pulse" />
          )}
        </div>
      </div>

      {/* Senter / Flashlight toggle button */}
      {hasTorch && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTorch();
          }}
          className={`absolute top-2.5 right-2.5 z-10 flex size-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
            torchOn
              ? "bg-amber-400 text-black shadow-lg shadow-amber-400/40"
              : "bg-black/60 text-white border border-white/15"
          }`}
          title={torchOn ? "Matikan lampu" : "Nyalakan lampu (Flash)"}
        >
          {torchOn ? <Zap className="size-4 fill-current" /> : <ZapOff className="size-4" />}
        </button>
      )}

      {/* Status Overlay Badge */}
      <div className="absolute inset-x-0 bottom-2.5 flex justify-center px-4">
        {paused ? (
          <div className="flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white shadow-lg border border-neutral-700/60 animate-bounce">
            <RefreshCw className="size-3" />
            <span>Ketuk layar untuk scan lagi</span>
          </div>
        ) : (
          <div className="rounded-full bg-black/60 backdrop-blur-md px-3 py-0.5 text-[11px] font-medium tracking-wide text-neutral-300 border border-white/10">
            Arahkan QR ke dalam bingkai
          </div>
        )}
      </div>
    </div>
  );
}
