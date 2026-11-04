import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import type { BatchItem } from "./types";

export function ImportHistory({ batches }: { batches: BatchItem[] }) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Riwayat impor</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Disimpan</TableHead>
              <TableHead className="text-right">Dilewati</TableHead>
              <TableHead>Oleh</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  Belum ada impor untuk event ini.
                </TableCell>
              </TableRow>
            )}
            {batches.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.createdLabel}</TableCell>
                <TableCell className="font-medium">{b.fileName}</TableCell>
                <TableCell className="text-right tabular-nums">{b.totalRows}</TableCell>
                <TableCell className="text-right tabular-nums">{b.successRows}</TableCell>
                <TableCell className="text-right tabular-nums">{b.failedRows}</TableCell>
                <TableCell>{b.userName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
