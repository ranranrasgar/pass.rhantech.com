"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { NativeSelect } from "@/views/components/NativeSelect";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";

export type AuditItem = {
  id: number;
  time: string;
  user: string;
  action: string;
  entity: string;
  reason: string | null;
  before: string | null;
  after: string | null;
};
type Filters = { user?: number; action?: string; from?: string; to?: string };
type Props = { rows: AuditItem[]; total: number; page: number; perPage: number; filters: Filters; users: { id: number; name: string }[]; actions: string[] };

export function AuditLogIndex({ rows, total, page, perPage, filters, users, actions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const pages = Math.max(1, Math.ceil(total / perPage));
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
    q.set("tab", "audit");
    if (p > 1) q.set("page", String(p));
    return q.size ? `${pathname}?${q}` : pathname;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">Semua aktivitas administratif (semua event). {total.toLocaleString("id-ID")} catatan.</p>
      </div>

      <form
        key={JSON.stringify(filters)}
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new URLSearchParams({ tab: "audit" });
          for (const [k, v] of new FormData(e.currentTarget)) if (String(v)) q.set(k, String(v));
          router.push(q.size ? `${pathname}?${q}` : pathname);
        }}
      >
        <NativeSelect name="user" defaultValue={filters.user ?? ""} className="w-48" aria-label="Pengguna">
          <option value="">Semua pengguna</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="action" defaultValue={filters.action ?? ""} className="w-48" aria-label="Aksi">
          <option value="">Semua aksi</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
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
              <TableHead>Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Objek</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tidak ada catatan.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id} className="align-top">
                <TableCell className="tabular-nums">{r.time}</TableCell>
                <TableCell>{r.user}</TableCell>
                <TableCell className="font-mono text-xs">{r.action}</TableCell>
                <TableCell className="text-xs">{r.entity}</TableCell>
                <TableCell className="max-w-56 whitespace-normal text-xs">{r.reason ?? "—"}</TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  {r.before || r.after ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground">lihat</summary>
                      {r.before && (
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2">
                          <b>Sebelum:</b> {r.before}
                        </pre>
                      )}
                      {r.after && (
                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2">
                          <b>Sesudah:</b> {r.after}
                        </pre>
                      )}
                    </details>
                  ) : (
                    "—"
                  )}
                </TableCell>
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
          {page > 1 && <Link href={href(page - 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">← Sebelumnya</Link>}
          {page < pages && <Link href={href(page + 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">Berikutnya →</Link>}
        </div>
      </div>
    </div>
  );
}
