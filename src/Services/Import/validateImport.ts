// Logika murni impor tamu: pilih sheet, deteksi header, auto-map, validasi baris.
import type { Sheet } from "./readSpreadsheet";

export const IMPORT_FIELDS = ["externalCode", "name", "groupName", "notes"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** Kolom sistem -> index kolom sumber (0-based). */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export const FIELD_LABELS: Record<ImportField, string> = {
  externalCode: "Kode tamu (No)",
  name: "Nama",
  groupName: "Grup",
  notes: "Catatan",
};

// Aturan Lampiran A.4 #5: No, nama, dan grup wajib.
export const REQUIRED_FIELDS: ImportField[] = ["externalCode", "name", "groupName"];

const SYNONYMS: Record<ImportField, string[]> = {
  externalCode: ["no", "no.", "nomor", "kode", "kode tamu", "code", "id", "no peserta"],
  name: ["nama lengkap", "nama", "name", "full name", "nama tamu"],
  groupName: ["group", "grup", "kelompok", "instansi", "perusahaan"],
  notes: ["catatan", "keterangan", "notes", "note", "ket"],
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const isEmptyRow = (row: string[]) => row.every((c) => norm(c) === "");

/** Sheet pertama yang punya header + minimal satu baris data. */
export function pickDefaultSheet(sheets: Sheet[]): number {
  const i = sheets.findIndex((s) => s.rows.filter((r) => !isEmptyRow(r)).length >= 2);
  return i === -1 ? 0 : i;
}

/** Baris header = baris tidak kosong pertama. */
export function detectHeaderRow(rows: string[][]): number {
  const i = rows.findIndex((r) => !isEmptyRow(r));
  return i === -1 ? 0 : i;
}

export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lower = headers.map((h) => norm(h).toLowerCase());
  for (const field of IMPORT_FIELDS) {
    const idx = lower.findIndex((h, i) => SYNONYMS[field].includes(h) && !Object.values(mapping).includes(i));
    if (idx !== -1) mapping[field] = idx;
  }
  return mapping;
}

export type RowStatus = "valid" | "failed" | "duplicate_file" | "duplicate_db";

export type ImportRow = {
  rowNumber: number; // nomor baris di file (1-based, seperti di Excel)
  externalCode: string;
  name: string;
  groupName: string;
  notes: string;
  status: RowStatus;
  reason?: string;
};

export type ImportSummary = {
  total: number;
  valid: number;
  failed: number;
  duplicateInFile: number;
  duplicateInDb: number;
  groups: Record<string, number>; // hanya baris valid
};

export function missingRequired(mapping: ColumnMapping): ImportField[] {
  return REQUIRED_FIELDS.filter((f) => mapping[f] === undefined);
}

/**
 * Validasi baris data di bawah header.
 * `existingCodes` = external_code yang sudah ada di event tujuan.
 */
export function validateRows(
  rows: string[][],
  headerRow: number,
  mapping: ColumnMapping,
  existingCodes: Set<string>,
): ImportRow[] {
  const seen = new Set<string>();
  const result: ImportRow[] = [];
  const get = (row: string[], field: ImportField) => {
    const idx = mapping[field];
    return idx === undefined ? "" : norm(row[idx] ?? "");
  };

  rows.slice(headerRow + 1).forEach((row, i) => {
    if (isEmptyRow(row)) return; // baris kosong tidak dihitung
    const item: ImportRow = {
      rowNumber: headerRow + 2 + i,
      externalCode: get(row, "externalCode"),
      name: get(row, "name"),
      groupName: get(row, "groupName"),
      notes: get(row, "notes"),
      status: "valid",
    };
    const missing = REQUIRED_FIELDS.filter((f) => item[f] === "").map((f) => FIELD_LABELS[f]);
    if (missing.length) {
      item.status = "failed";
      item.reason = `${missing.join(", ")} kosong`;
    } else if (item.externalCode.length > 100 || item.name.length > 191 || item.groupName.length > 100) {
      item.status = "failed";
      item.reason = "Isi kolom terlalu panjang";
    } else if (seen.has(item.externalCode)) {
      item.status = "duplicate_file";
      item.reason = `Kode ${item.externalCode} muncul lebih dari sekali di file`;
    } else if (existingCodes.has(item.externalCode)) {
      item.status = "duplicate_db";
      item.reason = `Kode ${item.externalCode} sudah ada di event ini`;
    }
    if (item.externalCode) seen.add(item.externalCode);
    result.push(item);
  });
  return result;
}

export function summarize(rows: ImportRow[]): ImportSummary {
  const s: ImportSummary = { total: rows.length, valid: 0, failed: 0, duplicateInFile: 0, duplicateInDb: 0, groups: {} };
  for (const r of rows) {
    if (r.status === "valid") {
      s.valid++;
      s.groups[r.groupName] = (s.groups[r.groupName] ?? 0) + 1;
    } else if (r.status === "failed") s.failed++;
    else if (r.status === "duplicate_file") s.duplicateInFile++;
    else s.duplicateInDb++;
  }
  return s;
}
