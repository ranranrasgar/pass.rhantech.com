// Logika murni impor tamu: pilih sheet, deteksi header, auto-map, validasi baris.
// Keputusan pengguna (4 Nov 2026): kolom No di file DIABAIKAN; kode tamu dibuat
// sistem (0001, 0002, ... per event). Duplikat dikenali dari nama + grup.
import type { Sheet } from "./readSpreadsheet";

export const IMPORT_FIELDS = ["name", "groupName", "notes"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** Kolom sistem -> index kolom sumber (0-based). */
export type ColumnMapping = Partial<Record<ImportField, number>>;

export const FIELD_LABELS: Record<ImportField, string> = {
  name: "Nama",
  groupName: "Grup",
  notes: "Catatan",
};

export const REQUIRED_FIELDS: ImportField[] = ["name", "groupName"];

const SYNONYMS: Record<ImportField, string[]> = {
  name: ["nama lengkap", "nama", "name", "full name", "nama tamu"],
  groupName: ["group", "grup", "kelompok", "entitas", "instansi", "perusahaan"],
  notes: ["catatan", "keterangan", "notes", "note", "ket"],
};

const CODE_DIGITS = 4;

const norm = (s: string) => s.replace(/\s+/g, " ").trim();
const isEmptyRow = (row: string[]) => row.every((c) => norm(c) === "");

/** Kunci duplikat: nama + grup, tanpa beda huruf besar/kecil & spasi. */
export function guestKey(name: string, groupName: string): string {
  return `${norm(name).toUpperCase()}|${norm(groupName).toUpperCase()}`;
}

/** 1 -> "0001"; di atas 9999 tetap utuh ("10000"). */
export function formatGuestCode(n: number): string {
  return String(n).padStart(CODE_DIGITS, "0");
}

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
  code: string; // kode tamu yang akan dibuat (hanya baris valid; "" untuk lainnya)
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
  codeFrom: string | null; // rentang kode baris valid
  codeTo: string | null;
};

export function missingRequired(mapping: ColumnMapping): ImportField[] {
  return REQUIRED_FIELDS.filter((f) => mapping[f] === undefined);
}

/**
 * Validasi baris data di bawah header, lalu beri kode berurutan mulai `firstCode`
 * ke baris valid. `existingKeys` = guestKey() tamu yang sudah ada di event tujuan.
 */
export function validateRows(
  rows: string[][],
  headerRow: number,
  mapping: ColumnMapping,
  existingKeys: Set<string>,
  firstCode: number,
): ImportRow[] {
  const seen = new Set<string>();
  const result: ImportRow[] = [];
  let next = firstCode;
  const get = (row: string[], field: ImportField) => {
    const idx = mapping[field];
    return idx === undefined ? "" : norm(row[idx] ?? "");
  };

  rows.slice(headerRow + 1).forEach((row, i) => {
    if (isEmptyRow(row)) return; // baris kosong tidak dihitung
    const item: ImportRow = {
      rowNumber: headerRow + 2 + i,
      code: "",
      name: get(row, "name"),
      groupName: get(row, "groupName"),
      notes: get(row, "notes"),
      status: "valid",
    };
    const key = guestKey(item.name, item.groupName);
    const missing = REQUIRED_FIELDS.filter((f) => item[f] === "").map((f) => FIELD_LABELS[f]);
    if (missing.length) {
      item.status = "failed";
      item.reason = `${missing.join(", ")} kosong`;
    } else if (item.name.length > 191 || item.groupName.length > 100) {
      item.status = "failed";
      item.reason = "Isi kolom terlalu panjang";
    } else if (seen.has(key)) {
      item.status = "duplicate_file";
      item.reason = "Nama + grup yang sama muncul lebih dari sekali di file";
    } else if (existingKeys.has(key)) {
      item.status = "duplicate_db";
      item.reason = "Nama + grup ini sudah ada di event";
    } else {
      item.code = formatGuestCode(next++);
    }
    if (!missing.length) seen.add(key);
    result.push(item);
  });
  return result;
}

export function summarize(rows: ImportRow[]): ImportSummary {
  const s: ImportSummary = {
    total: rows.length,
    valid: 0,
    failed: 0,
    duplicateInFile: 0,
    duplicateInDb: 0,
    groups: {},
    codeFrom: null,
    codeTo: null,
  };
  for (const r of rows) {
    if (r.status === "valid") {
      s.valid++;
      s.groups[r.groupName] = (s.groups[r.groupName] ?? 0) + 1;
      s.codeFrom ??= r.code;
      s.codeTo = r.code;
    } else if (r.status === "failed") s.failed++;
    else if (r.status === "duplicate_file") s.duplicateInFile++;
    else s.duplicateInDb++;
  }
  return s;
}
