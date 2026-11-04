import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import type { ImportRow, PreviewData } from "./types";

const STATUS_LABEL: Record<ImportRow["status"], string> = {
  valid: "Valid",
  failed: "Gagal",
  duplicate_file: "Duplikat di file",
  duplicate_db: "Sudah ada",
};

/** Ringkasan + daftar baris bermasalah + contoh baris valid. */
export function ImportPreview({ preview }: { preview: PreviewData }) {
  const s = preview.summary;
  const stats: [string, number, string?][] = [
    ["Total baris", s.total],
    ["Valid (akan disimpan)", s.valid, "text-green-700 dark:text-green-400"],
    ["Gagal validasi", s.failed, s.failed ? "text-destructive" : undefined],
    ["Duplikat di file", s.duplicateInFile, s.duplicateInFile ? "text-orange-600" : undefined],
    ["Sudah ada di event", s.duplicateInDb, s.duplicateInDb ? "text-orange-600" : undefined],
  ];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(([label, value, cls]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={`text-2xl font-semibold tabular-nums ${cls ?? ""}`}>{value.toLocaleString("id-ID")}</dd>
          </div>
        ))}
      </dl>

      {s.codeFrom && (
        <p className="text-sm">
          <span className="text-muted-foreground">Kode tamu yang akan dibuat: </span>
          <span className="font-semibold tabular-nums">
            {s.codeFrom} – {s.codeTo}
          </span>
          <span className="text-muted-foreground"> (kolom No di file diabaikan)</span>
        </p>
      )}

      {Object.keys(s.groups).length > 0 && (
        <p className="text-sm">
          <span className="text-muted-foreground">Grup (baris valid): </span>
          {Object.entries(s.groups)
            .map(([g, n]) => `${g} ${n}`)
            .join(" · ")}
        </p>
      )}

      {preview.problems.length > 0 && (
        <RowsTable title={`Baris bermasalah (${preview.problems.length}) — tidak akan disimpan`} rows={preview.problems} showReason />
      )}
      {preview.sample.length > 0 && <RowsTable title={`Contoh baris valid (${preview.sample.length} pertama)`} rows={preview.sample} />}
    </div>
  );
}

function RowsTable({ title, rows, showReason }: { title: string; rows: ImportRow[]; showReason?: boolean }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="max-h-96 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Baris</TableHead>
              <TableHead className="w-20">Kode baru</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Grup</TableHead>
              {showReason && <TableHead>Alasan</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.rowNumber}>
                <TableCell className="tabular-nums">{r.rowNumber}</TableCell>
                <TableCell className="tabular-nums">{r.code || "—"}</TableCell>
                <TableCell>{r.name || "—"}</TableCell>
                <TableCell>{r.groupName || "—"}</TableCell>
                {showReason && (
                  <TableCell className="whitespace-normal">
                    <span className="font-medium">{STATUS_LABEL[r.status]}:</span> {r.reason}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
