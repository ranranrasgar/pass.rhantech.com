import { Card, CardContent, CardHeader, CardTitle } from "@/views/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { AutoRefresh } from "./AutoRefresh";

export type Attendance = {
  registered: number;
  present: number;
  absent: number;
  percent: number;
  perGate: { gate: string; count: number }[];
  latest: { time: string; name: string; group: string; code: string | null; gate: string; officer: string }[];
  updatedAt: string;
};

const n = (v: number) => v.toLocaleString("id-ID");

export function AttendancePanel({ a }: { a: Attendance }) {
  const stats: [string, string][] = [
    ["Terdaftar (aktif)", n(a.registered)],
    ["Sudah hadir", n(a.present)],
    ["Belum hadir", n(a.absent)],
    ["Kehadiran", `${a.percent.toLocaleString("id-ID")}%`],
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Kehadiran</CardTitle>
        <span className="text-xs text-muted-foreground">
          Diperbarui {a.updatedAt} · otomatis tiap 10 detik <AutoRefresh seconds={10} />
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, a.percent)}%` }} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Per gate</h3>
            {a.perGate.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada gate.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {a.perGate.map((g) => (
                  <li key={g.gate} className="flex justify-between rounded-md border px-3 py-1.5">
                    <span>{g.gate}</span>
                    <span className="font-semibold tabular-nums">{n(g.count)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold">10 check-in terbaru</h3>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Grup</TableHead>
                    <TableHead>Gate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {a.latest.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        Belum ada tamu yang check-in.
                      </TableCell>
                    </TableRow>
                  )}
                  {a.latest.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="tabular-nums">{c.time}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.group}</TableCell>
                      <TableCell>{c.gate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
