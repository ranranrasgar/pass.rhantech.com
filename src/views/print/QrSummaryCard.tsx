"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Button } from "@/views/components/ui/button";

export type QrSummary = { activeGuests: number; withQr: number; withoutQr: number };

export function QrSummaryCard({ summary }: { summary: QrSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!confirm(`Buat QR untuk ${summary.withoutQr} tamu aktif yang belum punya QR?`)) return;
    setBusy(true);
    const res = await apiSend<{ created: number }>("/api/qr/generate", "POST");
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${res.data.created} QR dibuat`);
    router.refresh();
  }

  async function reissueAll() {
    const reason = prompt(
      [
        `Terbitkan ulang QR untuk SEMUA ${summary.activeGuests} tamu aktif?`,
        "",
        "Semua QR lama dicabut: gelang yang SUDAH dicetak TIDAK BERLAKU lagi dan harus dicetak ulang.",
        "Gunakan untuk ganti ke QR format baru (lebih besar) atau bila PDF bocor.",
        "",
        "Alasan (wajib):",
      ].join("\n"),
    )?.trim();
    if (!reason) return;
    if (!confirm(`Yakin? ${summary.withQr} gelang lama akan tidak berlaku.`)) return;
    setBusy(true);
    const res = await apiSend<{ revoked: number; created: number }>("/api/qr/reissue-all", "POST", { reason });
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`${res.data.created} QR baru dibuat, ${res.data.revoked} QR lama dicabut — cetak ulang gelang`);
    router.refresh();
  }

  const stats: [string, number][] = [
    ["Tamu aktif", summary.activeGuests],
    ["Punya QR", summary.withQr],
    ["Belum punya QR", summary.withoutQr],
  ];

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <dl className="flex flex-wrap gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-32 rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value.toLocaleString("id-ID")}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={busy || summary.withoutQr === 0}>
          {busy ? "Membuat…" : `Buat QR (${summary.withoutQr})`}
        </Button>
        {summary.withQr > 0 && (
          <Button variant="outline" onClick={reissueAll} disabled={busy}>
            Terbitkan ulang semua QR
          </Button>
        )}
        <a href="/api/qr/export" className="inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-medium hover:bg-muted">
          Ekspor daftar QR (XLSX)
        </a>
      </div>
    </div>
  );
}
