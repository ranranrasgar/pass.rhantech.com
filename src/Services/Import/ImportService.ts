import "server-only";
import { db } from "@/lib/db";
import type { DbClient } from "@/Models/types";
import { HttpError } from "@/Http/Middleware/Authenticate";
import { Guest } from "@/Models/Guest";
import { ImportBatch } from "@/Models/ImportBatch";
import { AuditLog } from "@/Models/AuditLog";
import { ImportFileError, MAX_IMPORT_BYTES, readSpreadsheet } from "./readSpreadsheet";
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
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_IMPORT_BYTES + 64 * 1024) throw new HttpError(413, "Ukuran file maksimal 5 MB");
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

/** Baca file + tentukan sheet, header, dan pemetaan. Belum menyentuh DB. */
async function readAndMap(input: ImportInput) {
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
  return {
    fileName: input.file.name,
    sheets: sheets.map((s) => s.name),
    sheet: sheets[sheetIndex].name,
    headerRow,
    headers,
    mapping,
    missing: missingRequired(mapping).map((f) => FIELD_LABELS[f]),
    rows,
  };
}

async function validate(eventId: number, file: Awaited<ReturnType<typeof readAndMap>>, client: DbClient = db) {
  if (file.missing.length) return [];
  const [keys, firstCode] = await Promise.all([Guest.existingKeys(eventId, client), Guest.nextCodeNumber(eventId, client)]);
  return validateRows(file.rows, file.headerRow, file.mapping, keys, firstCode);
}

/** Pratinjau: baca + validasi + kode yang AKAN dibuat, tanpa menyimpan. */
export async function analyzeImport(eventId: number, input: ImportInput) {
  const file = await readAndMap(input);
  const result = await validate(eventId, file);
  return { ...file, headerRow: file.headerRow + 1, summary: summarize(result), rows: result };
}

/**
 * Simpan hanya baris valid dalam satu transaksi + catat import_batches.
 * Validasi & penomoran diulang di dalam transaksi setelah kunci per event,
 * jadi kode tetap berurutan & unik walau ada impor/tambah tamu bersamaan.
 */
export async function commitImport(eventId: number, userId: number, input: ImportInput) {
  const file = await readAndMap(input);
  if (file.missing.length) throw new HttpError(422, `Kolom wajib belum dipetakan: ${file.missing.join(", ")}`);

  return db.$transaction(
    async (tx) => {
      await Guest.lockCodes(eventId, tx);
      const result = await validate(eventId, file, tx);
      const summary = summarize(result);
      const valid = result.filter((r) => r.status === "valid");
      if (valid.length === 0) throw new HttpError(422, "Tidak ada baris valid untuk disimpan");

      const created = await ImportBatch.create(
        { eventId, fileName: file.fileName, totalRows: summary.total, successRows: 0, failedRows: 0, createdBy: userId },
        tx,
      );
      const { count } = await tx.guest.createMany({
        data: valid.map((r) => ({
          eventId,
          externalCode: r.code,
          name: r.name,
          groupName: r.groupName,
          notes: r.notes || null,
          importBatchId: created.id,
        })),
      });
      const batch = await ImportBatch.update(created.id, { successRows: count, failedRows: summary.total - count }, tx);
      await AuditLog.record(
        { userId, action: "import.commit", entityType: "import_batch", entityId: created.id, after: { ...batch, summary } },
        tx,
      );
      return { batch, summary };
    },
    { timeout: 30_000 },
  );
}
