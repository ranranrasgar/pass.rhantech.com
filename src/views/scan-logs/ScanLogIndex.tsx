"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { NativeSelect } from "@/views/components/NativeSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";

export const RESULT_LABELS: Record<string, string> = {
  SUCCESS: "Berhasil",
  ALREADY_CHECKED_IN: "Sudah check-in",
  UNKNOWN_QR: "QR tidak dikenal",
  INACTIVE: "Tidak aktif",
  WRONG_EVENT: "Event tidak sesuai",
  ERROR: "Error",
};

export type ScanLogItem = { id: number; time: string; result: string; message: string; gate: string | null; user: string | null };
type Option = { id: number; name: string };
type Filters = { result?: string; gate?: number; user?: number; from?: string; to?: string };
type Props = { eventName: string; rows: ScanLogItem[]; total: number; page: number; perPage: number; filters: Filters; gates: Option[]; users: Option[] };

const variant = (r: string) => (r === "SUCCESS" ? "default" : r === "ALREADY_CHECKED_IN" ? "secondary" : "destructive");

export function ScanLogIndex({ eventName, rows, total, page, perPage, filters, gates, users }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pages = Math.max(1, Math.ceil(total / perPage));

  const params = (p?: number) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    if (p && p > 1) q.set("page", String(p));
    return q.size ? `${pathname}?${q}` : pathname;
  };

  function apply(form: HTMLFormElement) {
    const q = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (String(v)) q.set(k, String(v));
    router.push(q.size ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Riwayat Scan</h1>
        <p className="text-sm text-muted-foreground">
          Event: {eventName} · {total.toLocaleString("id-ID")} scan (termasuk yang ditolak)
        </p>
      </div>

      <form
        key={JSON.stringify(filters)}
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
        }}
      >
        <NativeSelect name="result" defaultValue={filters.result ?? ""} className="w-44" aria-label="Hasil">
          <option value="">Semua hasil</option>
          {Object.entries(RESULT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="gate" defaultValue={filters.gate ?? ""} className="w-36" aria-label="Gate">
          <option value="">Semua gate</option>
          {gates.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="user" defaultValue={filters.user ?? ""} className="w-44" aria-label="Petugas">
          <option value="">Semua petugas</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
        <Input type="date" name="from" defaultValue={filters.from} className="w-40" aria-label="Dari tanggal" />
        <Input type="date" name="to" defaultValue={filters.to} className="w-40" aria-label="Sampai tanggal" />
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Hasil</TableHead>
              <TableHead>Gate</TableHead>
              <TableHead>Petugas</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada scan.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="tabular-nums">{r.time}</TableCell>
                <TableCell>
                  <Badge variant={variant(r.result)}>{RESULT_LABELS[r.result] ?? r.result}</Badge>
                </TableCell>
                <TableCell>{r.gate ?? "—"}</TableCell>
                <TableCell>{r.user ?? "—"}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">{r.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Halaman {page} dari {pages}
        </span>
        <div className="flex gap-2">
          {page > 1 && <Link href={params(page - 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">← Sebelumnya</Link>}
          {page < pages && <Link href={params(page + 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">Berikutnya →</Link>}
        </div>
      </div>
    </div>
  );
}
