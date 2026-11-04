import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/Http/Middleware/Authenticate";
import { Guest } from "@/Models/Guest";
import { ImportBatch } from "@/Models/ImportBatch";
import { AuditLog } from "@/Models/AuditLog";
import { ImportFileError, readSpreadsheet } from "./readSpreadsheet";
import {
  autoMap,
  detectHeaderRow,
  FIELD_LABELS,
  IMPORT_FIELDS,
  missingRequired,
  pickDefaultSheet,
  summarize,
  validateRows,
  type ColumnMapping,
} from "./validateImport";

export type ImportInput = { file: File; sheet?: string; mapping?: ColumnMapping };

/** Baca form multipart: file, sheet (opsional), mapping JSON (opsional). */
export async function parseImportForm(req: Request): Promise<ImportInput> {
  const form = await req.formData().catch(() => {
    throw new HttpError(400, "Kirim file sebagai multipart/form-data");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(422, "File wajib dipilih");
  const sheet = typeof form.get("sheet") === "string" ? String(form.get("sheet")) : undefined;
  let mapping: ColumnMapping | undefined;
  const raw = form.get("mapping");
  if (typeof raw === "string" && raw) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      mapping = {};
      for (const f of IMPORT_FIELDS) {
        if (Number.isInteger(obj[f]) && (obj[f] as number) >= 0) mapping[f] = obj[f] as number;
      }
    } catch {
      throw new HttpError(422, "Pemetaan kolom tidak valid");
    }
  }
  return { file, sheet, mapping };
}

/** Baca + validasi tanpa menyimpan. Dipakai pratinjau dan commit (stateless). */
export async function analyzeImport(eventId: number, input: ImportInput) {
  let sheets;
  try {
    sheets = await readSpreadsheet(input.file.name, new Uint8Array(await input.file.arrayBuffer()));
  } catch (err) {
    if (err instanceof ImportFileError) throw new HttpError(422, err.message);
    throw err;
  }
  if (sheets.length === 0) throw new HttpError(422, "Workbook tidak berisi sheet");

  const found = input.sheet ? sheets.findIndex((s) => s.name === input.sheet) : -1;
  const sheetIndex = found === -1 ? pickDefaultSheet(sheets) : found;
  const rows = sheets[sheetIndex].rows;
  const headerRow = detectHeaderRow(rows);
  const headers = rows[headerRow] ?? [];
  const mapping = input.mapping ?? autoMap(headers);
  const missing = missingRequired(mapping);

  const result = missing.length ? [] : validateRows(rows, headerRow, mapping, await Guest.existingCodes(eventId));
  return {
    fileName: input.file.name,
    sheets: sheets.map((s) => s.name),
    sheet: sheets[sheetIndex].name,
    headerRow: headerRow + 1,
    headers,
    mapping,
    missing: missing.map((f) => FIELD_LABELS[f]),
    summary: summarize(result),
    rows: result,
  };
}

/** Simpan hanya baris valid dalam satu transaksi + catat import_batches. */
export async function commitImport(eventId: number, userId: number, input: ImportInput) {
  const analysis = await analyzeImport(eventId, input);
  if (analysis.missing.length) throw new HttpError(422, `Kolom wajib belum dipetakan: ${analysis.missing.join(", ")}`);
  const valid = analysis.rows.filter((r) => r.status === "valid");
  if (valid.length === 0) throw new HttpError(422, "Tidak ada baris valid untuk disimpan");

  const batch = await db.$transaction(
    async (tx) => {
      const created = await ImportBatch.create(
        { eventId, fileName: analysis.fileName, totalRows: analysis.summary.total, successRows: 0, failedRows: 0, createdBy: userId },
        tx,
      );
      // skipDuplicates: aman bila ada impor lain bersamaan (unique event_id + external_code).
      const { count } = await tx.guest.createMany({
        data: valid.map((r) => ({
          eventId,
          externalCode: r.externalCode,
          name: r.name,
          groupName: r.groupName,
          notes: r.notes || null,
          importBatchId: created.id,
        })),
        skipDuplicates: true,
      });
      const done = await ImportBatch.update(
        created.id,
        { successRows: count, failedRows: analysis.summary.total - count },
        tx,
      );
      await AuditLog.record(
        { userId, action: "import.commit", entityType: "import_batch", entityId: created.id, after: { ...done, summary: analysis.summary } },
        tx,
      );
      return done;
    },
    { timeout: 30_000 },
  );
  return { batch, summary: analysis.summary };
}
