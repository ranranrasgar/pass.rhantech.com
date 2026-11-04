import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ImportFileError, readSpreadsheet } from "./readSpreadsheet";
import { autoMap, detectHeaderRow, missingRequired, pickDefaultSheet, summarize, validateRows } from "./validateImport";

async function xlsx(sheets: Record<string, unknown[][]>): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(sheets)) wb.addWorksheet(name).addRows(rows);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

const HEADER = ["No", "NAMA LENGKAP", "GROUP"];

describe("readSpreadsheet", () => {
  it("membaca XLSX; angka No menjadi string", async () => {
    const bytes = await xlsx({ Sheet1: [HEADER, [1, " Singgih  Wiratama ", "BANK CAPITAL"]], Sheet2: [] });
    const sheets = await readSpreadsheet("data.xlsx", bytes);
    expect(sheets.map((s) => s.name)).toEqual(["Sheet1", "Sheet2"]);
    expect(sheets[0].rows[1]).toEqual(["1", " Singgih  Wiratama ", "BANK CAPITAL"]);
  });

  it("membaca CSV (dengan BOM, pemisah ; atau ,)", async () => {
    const enc = new TextEncoder();
    const a = await readSpreadsheet("a.csv", enc.encode("﻿No,NAMA LENGKAP,GROUP\n1,Anisah,AMP\n"));
    const b = await readSpreadsheet("b.csv", enc.encode("No;NAMA LENGKAP;GROUP\n1;Anisah;AMP\n"));
    expect(a[0].rows[1]).toEqual(["1", "Anisah", "AMP"]);
    expect(b[0].rows[0]).toEqual(HEADER);
  });

  it("menolak ekstensi lain dan isi yang tidak cocok dengan ekstensi", async () => {
    await expect(readSpreadsheet("x.pdf", new Uint8Array([1]))).rejects.toThrow(ImportFileError);
    await expect(readSpreadsheet("x.xlsx", new TextEncoder().encode("No,Nama"))).rejects.toThrow("bukan XLSX");
    await expect(readSpreadsheet("x.csv", new Uint8Array([0x50, 0x4b, 0x03, 0x00]))).rejects.toThrow("bukan CSV");
  });
});

describe("validateImport", () => {
  it("memilih sheet pertama yang berisi data dan mengenali header", () => {
    const sheets = [{ name: "Kosong", rows: [] }, { name: "Data", rows: [[], HEADER, ["1", "A", "G"]] }];
    expect(pickDefaultSheet(sheets)).toBe(1);
    expect(detectHeaderRow(sheets[1].rows)).toBe(1);
  });

  it("auto-map kolom No / NAMA LENGKAP / GROUP", () => {
    const mapping = autoMap(HEADER);
    expect(mapping).toEqual({ externalCode: 0, name: 1, groupName: 2 });
    expect(missingRequired(mapping)).toEqual([]);
    expect(missingRequired(autoMap(["Nama"]))).toEqual(["externalCode", "groupName"]);
  });

  it("TC-02: nama/grup/No kosong -> gagal dengan nomor baris dan alasan", () => {
    const rows = [HEADER, ["1", "", "AMP"], ["", "Budi", ""], [], ["3", "Citra", "CS3"]];
    const result = validateRows(rows, 0, autoMap(HEADER), new Set());
    expect(result.map((r) => [r.rowNumber, r.status, r.reason])).toEqual([
      [2, "failed", "Nama kosong"],
      [3, "failed", "Kode tamu (No), Grup kosong"],
      [5, "valid", undefined],
    ]);
  });

  it("TC-03: duplikat kode di file dan di DB ditandai, spasi dirapikan", () => {
    const rows = [HEADER, ["1", "  Ani   Sari ", "AMP"], ["1", "Ani", "AMP"], ["2", "Budi", "CS3"]];
    const result = validateRows(rows, 0, autoMap(HEADER), new Set(["2"]));
    expect(result[0]).toMatchObject({ name: "Ani Sari", status: "valid" });
    expect(result[1].status).toBe("duplicate_file");
    expect(result[2].status).toBe("duplicate_db");
    expect(summarize(result)).toEqual({ total: 3, valid: 1, failed: 0, duplicateInFile: 1, duplicateInDb: 1, groups: { AMP: 1 } });
  });
});
