"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { EventStatusBadge } from "@/views/events/EventStatusBadge";
import type { EventStatus } from "@/generated/prisma/enums";

export type TestModeRow = { id: number; name: string; status: EventStatus; testMode: boolean; testCheckIns: number; testScanLogs: number };
type Removed = { checkIns: number; scanLogs: number };

export function TestModeTab({ events }: { events: TestModeRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function run(e: TestModeRow, url: string, data: unknown, done: (r: { removed: Removed }) => string) {
    setBusy(e.id);
    const res = await apiSend<{ removed: Removed }>(url, "POST", data);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(done(res.data));
    router.refresh();
  }

  const enable = (e: TestModeRow) => {
    if (!confirm(`Aktifkan Mode Uji untuk "${e.name}"?\n\nSemua scan & check-in selama mode uji ditandai UJI dan akan DIHAPUS saat mode uji diakhiri. Jangan aktifkan saat tamu asli sudah mulai masuk.`)) return;
    run(e, `/api/events/${e.id}/test-mode`, { enabled: true }, () => `Mode Uji aktif untuk ${e.name}`);
  };
  const finish = (e: TestModeRow) => {
    if (!confirm(`Akhiri Mode Uji "${e.name}"?\n\n${e.testCheckIns} check-in uji dan ${e.testScanLogs} log scan uji akan DIHAPUS, lalu event kembali ke mode Live.`)) return;
    run(e, `/api/events/${e.id}/test-mode`, { enabled: false }, (r) => `Mode Live. Dihapus: ${r.removed.checkIns} check-in uji, ${r.removed.scanLogs} log uji`);
  };
  const clear = (e: TestModeRow) => {
    if (!confirm(`Hapus ${e.testCheckIns} check-in uji dan ${e.testScanLogs} log scan uji "${e.name}"? Mode Uji tetap aktif.`)) return;
    run(e, `/api/events/${e.id}/clear-test-data`, {}, (r) => `Dihapus: ${r.removed.checkIns} check-in uji, ${r.removed.scanLogs} log uji`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p className="font-medium">Cara pakai</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-muted-foreground">
          <li>Aktifkan Mode Uji untuk gladi/uji gelang & perangkat gate — banner MODE UJI tampil di admin & layar scan.</li>
          <li>Scan seperti biasa; check-in & log ditandai UJI. Gunakan &quot;Hapus data uji&quot; untuk mengulang.</li>
          <li>Sebelum tamu asli datang: <b>Akhiri Mode Uji</b> → semua data uji dihapus, event menjadi Live.</li>
        </ol>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Check-in uji</TableHead>
              <TableHead className="text-right">Log scan uji</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Belum ada event.
                </TableCell>
              </TableRow>
            )}
            {events.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell>
                  <EventStatusBadge status={e.status} />
                </TableCell>
                <TableCell>
                  {e.testMode ? <Badge className="bg-amber-500 text-black">MODE UJI</Badge> : <Badge variant="outline">Live</Badge>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{e.testCheckIns}</TableCell>
                <TableCell className="text-right tabular-nums">{e.testScanLogs}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {e.testMode ? (
                      <>
                        <Button variant="outline" size="sm" disabled={busy === e.id || e.testCheckIns + e.testScanLogs === 0} onClick={() => clear(e)}>
                          Hapus data uji
                        </Button>
                        <Button size="sm" disabled={busy === e.id} onClick={() => finish(e)}>
                          Akhiri Mode Uji (Live)
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" disabled={busy === e.id} onClick={() => enable(e)}>
                        Aktifkan Mode Uji
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
