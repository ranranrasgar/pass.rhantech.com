"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { RESULT_LABELS } from "@/views/scan-logs/ScanLogIndex";

export type AttendanceItem = {
  no: number;
  checkInId: number | null;
  code: string | null;
  name: string;
  group: string;
  present: boolean;
  time: string | null;
  gate: string | null;
  officer: string | null;
};
export type GateItem = { gate: string; active: boolean; count: number };
export type RejectedItem = { no: number; id: number; time: string; result: string; message: string; gate: string | null; officer: string | null };

const Empty = ({ cols, text }: { cols: number; text: string }) => (
  <TableRow>
    <TableCell colSpan={cols} className="py-8 text-center text-muted-foreground">
      {text}
    </TableCell>
  </TableRow>
);

export function AttendanceTable({ rows, canCorrect }: { rows: AttendanceItem[]; canCorrect: boolean }) {
  const router = useRouter();

  async function cancel(r: AttendanceItem) {
    const reason = prompt(
      `Batalkan check-in ${r.name} (${r.gate}, ${r.time})?\nTamu akan tercatat belum hadir dan bisa scan masuk lagi. Data lama disimpan di Audit Log.\n\nAlasan (wajib):`,
    )?.trim();
    if (!reason) return;
    const res = await apiSend(`/api/check-ins/${r.checkInId}/cancel`, "POST", { reason });
    if (!res.ok) return toast.error(res.error);
    toast.success(`Check-in ${r.name} dibatalkan`);
    router.refresh();
  }

  const cols = canCorrect ? 9 : 8;
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No.</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Grup</TableHead>
            <TableHead>Kode</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Waktu hadir</TableHead>
            <TableHead>Gate</TableHead>
            <TableHead>Petugas</TableHead>
            {canCorrect && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <Empty cols={cols} text="Tidak ada data untuk filter ini." />}
          {rows.map((r) => (
            <TableRow key={r.no}>
              <TableCell className="tabular-nums">{r.no}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>{r.group}</TableCell>
              <TableCell className="tabular-nums">{r.code ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={r.present ? "default" : "outline"}>{r.present ? "Hadir" : "Belum hadir"}</Badge>
              </TableCell>
              <TableCell className="tabular-nums">{r.time ?? "—"}</TableCell>
              <TableCell>{r.gate ?? "—"}</TableCell>
              <TableCell>{r.officer ?? "—"}</TableCell>
              {canCorrect && (
                <TableCell className="text-right">
                  {r.checkInId && (
                    <Button variant="outline" size="sm" onClick={() => cancel(r)}>
                      Batalkan check-in
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function GateTable({ rows, total }: { rows: GateItem[]; total: number }) {
  return (
    <div className="max-w-xl rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Check-in</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <Empty cols={3} text="Belum ada gate." />}
          {rows.map((r) => (
            <TableRow key={r.gate}>
              <TableCell className="font-medium">{r.gate}</TableCell>
              <TableCell>{r.active ? "Aktif" : "Nonaktif"}</TableCell>
              <TableCell className="text-right tabular-nums">{r.count.toLocaleString("id-ID")}</TableCell>
            </TableRow>
          ))}
          {rows.length > 0 && (
            <TableRow>
              <TableCell colSpan={2} className="font-semibold">
                Total
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{total.toLocaleString("id-ID")}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function RejectedTable({ rows }: { rows: RejectedItem[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">No.</TableHead>
            <TableHead>Waktu</TableHead>
            <TableHead>Hasil</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Gate</TableHead>
            <TableHead>Petugas</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && <Empty cols={6} text="Tidak ada scan ditolak/duplikat." />}
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="tabular-nums">{r.no}</TableCell>
              <TableCell className="tabular-nums">{r.time}</TableCell>
              <TableCell>
                <Badge variant={r.result === "ALREADY_CHECKED_IN" ? "secondary" : "destructive"}>{RESULT_LABELS[r.result] ?? r.result}</Badge>
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">{r.message}</TableCell>
              <TableCell>{r.gate ?? "—"}</TableCell>
              <TableCell>{r.officer ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
