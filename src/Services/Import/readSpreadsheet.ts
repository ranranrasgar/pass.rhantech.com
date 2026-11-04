// Baca XLSX/CSV menjadi daftar sheet berisi baris string. Tidak menyentuh DB.
import ExcelJS from "exceljs";
import Papa from "papaparse";

export type Sheet = { name: string; rows: string[][] };

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export class ImportFileError extends Error {}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // XLSX = arsip ZIP

/** Cek ekstensi + isi file (bukan hanya ekstensi). */
export function detectKind(fileName: string, bytes: Uint8Array): "xlsx" | "csv" {
  const ext = fileName.toLowerCase().split(".").pop();
  if (ext === "xlsx") {
    if (!ZIP_MAGIC.every((b, i) => bytes[i] === b)) throw new ImportFileError("Isi file bukan XLSX yang valid");
    return "xlsx";
  }
  if (ext === "csv") {
    if (bytes.includes(0)) throw new ImportFileError("Isi file bukan CSV teks yang valid");
    return "csv";
  }
  throw new ImportFileError("Format file harus .xlsx atau .csv");
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("");
    if ("text" in value) return String(value.text); // hyperlink
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue); // formula
    if ("error" in value) return "";
  }
  return String(value);
}

async function readXlsx(bytes: Uint8Array): Promise<Sheet[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  } catch {
    throw new ImportFileError("File XLSX rusak atau tidak bisa dibaca");
  }
  return wb.worksheets.map((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values = row.values as ExcelJS.CellValue[]; // index 0 kosong (kolom mulai dari 1)
      rows[rowNumber - 1] = values.slice(1).map(cellText);
    });
    // Isi lubang baris kosong agar index = nomor baris - 1.
    return { name: ws.name, rows: Array.from(rows, (r) => r ?? []) };
  });
}

function readCsv(bytes: Uint8Array): Sheet[] {
  let text = new TextDecoder("utf-8").decode(bytes);
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM Excel
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: false, delimiter: "" });
  return [{ name: "CSV", rows: parsed.data.map((r) => r.map((c) => c ?? "")) }];
}

export async function readSpreadsheet(fileName: string, bytes: Uint8Array): Promise<Sheet[]> {
  if (bytes.byteLength === 0) throw new ImportFileError("File kosong");
  if (bytes.byteLength > MAX_IMPORT_BYTES) throw new ImportFileError("Ukuran file maksimal 5 MB");
  return detectKind(fileName, bytes) === "xlsx" ? readXlsx(bytes) : readCsv(bytes);
}
