import { describe, expect, it } from "vitest";
import { computeLayout, labelPosition, LayoutError, pageCount, parseCodeList, type LayoutInput } from "./layout";

const card: LayoutInput = {
  paper: "A4",
  orientation: "PORTRAIT",
  widthMm: 85.6,
  heightMm: 54,
  marginMm: 10,
  gapXMm: 5,
  gapYMm: 5,
  columns: null,
};

describe("computeLayout", () => {
  it("kartu 85,6×54 di A4 potret: 2 kolom × 4 baris", () => {
    // lebar: (190 + 5) / 90,6 = 2,15 -> 2 ; tinggi: (277 + 5) / 59 = 4,78 -> 4
    expect(computeLayout(card)).toEqual({ pageWidthMm: 210, pageHeightMm: 297, columns: 2, rows: 4, perPage: 8 });
  });

  it("landscape menukar ukuran kertas", () => {
    const l = computeLayout({ ...card, orientation: "LANDSCAPE" });
    expect([l.pageWidthMm, l.pageHeightMm, l.columns, l.rows]).toEqual([297, 210, 3, 3]);
  });

  it("label pas tepat (tanpa sisa) tetap dihitung muat", () => {
    const l = computeLayout({ ...card, widthMm: 95, heightMm: 277, marginMm: 10, gapXMm: 0, gapYMm: 0 });
    expect([l.columns, l.rows]).toEqual([2, 1]);
  });

  it("kolom manual dibatasi yang muat", () => {
    expect(computeLayout({ ...card, columns: 1 }).perPage).toBe(4);
    expect(() => computeLayout({ ...card, columns: 3 })).toThrow("Maksimal 2 kolom");
    expect(() => computeLayout({ ...card, widthMm: 300 })).toThrow(LayoutError);
  });

  it("LABEL: halaman = ukuran label (gelang 254×25,4)", () => {
    const band = { ...card, paper: "LABEL" as const, widthMm: 254, heightMm: 25.4 };
    expect(computeLayout(band)).toEqual({ pageWidthMm: 254, pageHeightMm: 25.4, columns: 1, rows: 1, perPage: 1 });
    expect(pageCount(computeLayout(band), 840)).toBe(840);
  });
});

describe("labelPosition", () => {
  it("posisi mengikuti margin, ukuran, dan jarak", () => {
    const l = computeLayout(card);
    expect(labelPosition(l, card, 0)).toEqual({ page: 0, xMm: 10, yMm: 10 });
    expect(labelPosition(l, card, 1)).toEqual({ page: 0, xMm: 100.6, yMm: 10 });
    expect(labelPosition(l, card, 2)).toEqual({ page: 0, xMm: 10, yMm: 69 });
    expect(labelPosition(l, card, 8)).toEqual({ page: 1, xMm: 10, yMm: 10 });
    expect(pageCount(l, 840)).toBe(105);
  });
});

describe("parseCodeList", () => {
  it("rentang + kode tunggal, dibandingkan sebagai angka", () => {
    const match = parseCodeList("0001-0003, 0150 10");
    expect(["0001", "0003", "0004", "0150", "10", "0010", null].map(match)).toEqual([true, true, false, true, true, true, false]);
  });

  it("format salah ditolak", () => {
    expect(() => parseCodeList("abc")).toThrow("Kode tidak valid");
    expect(() => parseCodeList("  ")).toThrow(LayoutError);
  });
});
