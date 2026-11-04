"use client";

import dynamic from "next/dynamic";

// Halaman scan bergantung pada kamera, Web Audio & localStorage -> render di client saja.
export const ScanStationClient = dynamic(() => import("./ScanStation").then((m) => m.ScanStation), {
  ssr: false,
  loading: () => <div className="flex min-h-screen items-center justify-center bg-black text-2xl font-bold text-white">Memuat scanner…</div>,
});
