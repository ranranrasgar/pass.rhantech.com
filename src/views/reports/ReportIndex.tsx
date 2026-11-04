"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { NativeSelect } from "@/views/components/NativeSelect";
import { AttendanceTable, GateTable, RejectedTable, type AttendanceItem, type GateItem, type RejectedItem } from "./ReportTables";

type Tab = "all" | "absent" | "gates" | "rejected";
export type ReportFilters = { tab: Tab; group?: string; gate?: number; status?: "present" | "absent"; from?: string; to?: string };
type Summary = { registered: number; present: number; absent: number; percent: number };
type Props = {
  eventName: string;
  summary: Summary;
  filters: ReportFilters;
  groups: string[];
  gates: { id: number; name: string }[];
  page: number;
  perPage: number;
  total: number;
  canCorrect: boolean;
  data: { kind: "attendance"; rows: AttendanceItem[] } | { kind: "gates"; rows: GateItem[] } | { kind: "rejected"; rows: RejectedItem[] };
};

const TABS: [Tab, string][] = [
  ["all", "Semua"],
  ["absent", "Belum Hadir"],
  ["gates", "Per Gate"],
  ["rejected", "Scan Ditolak/Duplikat"],
];

function query(f: ReportFilters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v !== undefined && v !== "" && !(k === "tab" && v === "all")) q.set(k, String(v));
  return q;
}

export function ReportIndex(p: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const f = p.filters;
  const pages = Math.max(1, Math.ceil(p.total / p.perPage));
  const href = (q: URLSearchParams) => (q.size ? `${pathname}?${q}` : pathname);

  function apply(form: HTMLFormElement) {
    const next: ReportFilters = { tab: f.tab };
    for (const [k, v] of new FormData(form)) if (String(v)) Object.assign(next, { [k]: String(v) });
    router.push(href(query(next)));
  }

  const stats: [string, string][] = [
    ["Terdaftar (aktif)", p.summary.registered.toLocaleString("id-ID")],
    ["Hadir", p.summary.present.toLocaleString("id-ID")],
    ["Belum hadir", p.summary.absent.toLocaleString("id-ID")],
    ["Kehadiran", `${p.summary.percent.toLocaleString("id-ID")}%`],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Laporan Kehadiran</h1>
          <p className="text-sm text-muted-foreground">Event: {p.eventName}</p>
        </div>
        <div className="flex gap-2">
          {(["xlsx", "csv"] as const).map((fmt) => (
            <a key={fmt} href={`/api/reports/export?${query(f, { format: fmt })}`} className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
              Ekspor {fmt.toUpperCase()}
            </a>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map(([tab, label]) => (
          <Link
            key={tab}
            href={href(query({ ...f, tab, status: undefined }))}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", f.tab === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <form
        key={JSON.stringify(f)}
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(e.currentTarget);
        }}
      >
        {f.tab !== "rejected" && (
          <NativeSelect name="group" defaultValue={f.group ?? ""} className="w-52" aria-label="Grup">
            <option value="">Semua grup</option>
            {p.groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </NativeSelect>
        )}
        {f.tab !== "absent" && f.tab !== "gates" && (
          <NativeSelect name="gate" defaultValue={f.gate ?? ""} className="w-36" aria-label="Gate">
            <option value="">Semua gate</option>
            {p.gates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {f.tab === "all" && (
          <NativeSelect name="status" defaultValue={f.status ?? ""} className="w-40" aria-label="Status kehadiran">
            <option value="">Hadir & belum</option>
            <option value="present">Hadir</option>
            <option value="absent">Belum hadir</option>
          </NativeSelect>
        )}
        {f.tab !== "absent" && (
          <>
            <Input type="date" name="from" defaultValue={f.from} className="w-40" aria-label="Dari tanggal" />
            <Input type="date" name="to" defaultValue={f.to} className="w-40" aria-label="Sampai tanggal" />
          </>
        )}
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
        <span className="text-sm text-muted-foreground">{p.total.toLocaleString("id-ID")} baris</span>
      </form>

      {p.data.kind === "attendance" && <AttendanceTable rows={p.data.rows} canCorrect={p.canCorrect} />}
      {p.data.kind === "gates" && <GateTable rows={p.data.rows} total={p.data.rows.reduce((s, r) => s + r.count, 0)} />}
      {p.data.kind === "rejected" && <RejectedTable rows={p.data.rows} />}

      {p.data.kind !== "gates" && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {p.page} dari {pages}
          </span>
          <div className="flex gap-2">
            {p.page > 1 && <Link href={href(query(f, { page: String(p.page - 1) }))} className="rounded-lg border px-3 py-1 hover:bg-muted">← Sebelumnya</Link>}
            {p.page < pages && <Link href={href(query(f, { page: String(p.page + 1) }))} className="rounded-lg border px-3 py-1 hover:bg-muted">Berikutnya →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
