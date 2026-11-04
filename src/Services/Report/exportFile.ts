// Bangun file XLSX / CSV dari kolom + baris. Murni (tanpa DB).
import ExcelJS from "exceljs";
import Papa from "papaparse";

export type Column<T> = { header: string; width: number; value: (row: T) => string | number | null };

export async function toXlsx<T>(sheetName: string, columns: Column<T>[], rows: T[], title?: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName.slice(0, 31));
  let start = 1;
  if (title) {
    ws.getCell(1, 1).value = title;
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    start = 3;
  }
  ws.getRow(start).values = columns.map((c) => c.header);
  ws.getRow(start).font = { bold: true };
  columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));
  rows.forEach((r, i) => (ws.getRow(start + 1 + i).values = columns.map((c) => c.value(r) ?? "")));
  ws.views = [{ state: "frozen", ySplit: start }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** CSV UTF-8 dengan BOM agar Excel membaca huruf non-ASCII dengan benar. */
export function toCsv<T>(columns: Column<T>[], rows: T[]): Buffer {
  const csv = Papa.unparse({ fields: columns.map((c) => c.header), data: rows.map((r) => columns.map((c) => c.value(r) ?? "")) });
  return Buffer.from("﻿" + csv, "utf8");
}
