import ExcelJS from "exceljs";
import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { toCsv, toXlsx, type Column } from "./exportFile";

type Row = { name: string; n: number | null };
const cols: Column<Row>[] = [
  { header: "Nama", width: 20, value: (r) => r.name },
  { header: "Jumlah", width: 8, value: (r) => r.n },
];
const rows: Row[] = [
  { name: 'Budi, "Bos" Santoso', n: 1 },
  { name: "Ani\nBaris", n: null },
];

describe("exportFile", () => {
  it("CSV: BOM UTF-8, header, koma & kutip di-escape, null jadi kosong", () => {
    const buf = toCsv(cols, rows);
    expect(buf.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    const parsed = Papa.parse<string[]>(buf.toString("utf8").slice(1)).data;
    expect(parsed).toEqual([["Nama", "Jumlah"], ['Budi, "Bos" Santoso', "1"], ["Ani\nBaris", ""]]);
  });

  it("XLSX: judul, header tebal, baris data", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await toXlsx("Uji", cols, rows, "Judul")) as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Uji")!;
    expect(ws.getCell("A1").value).toBe("Judul");
    expect(ws.getRow(3).values).toEqual([undefined, "Nama", "Jumlah"]);
    expect(ws.getCell("A4").value).toBe('Budi, "Bos" Santoso');
    expect(ws.rowCount).toBe(5);
  });
});
