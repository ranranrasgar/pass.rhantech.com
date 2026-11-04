import { describe, expect, it } from "vitest";
import { MM_TO_PT } from "./layout";
import { renderPdf, type PrintOptions, type PrintItem } from "./renderPdf";

const item = (i: number): PrintItem => ({
  eventName: "Event-Bandung",
  name: `Tamu ${i}`,
  group: "BANK CAPITAL",
  code: String(i).padStart(4, "0"),
  token: "VP1_" + "x".repeat(43),
});
const fields = { eventName: true, name: true, group: true, code: true };

/** Ambil semua MediaBox [0 0 w h] dari PDF (pt). */
function mediaBoxes(pdf: Buffer): number[][] {
  return [...pdf.toString("latin1").matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

describe("renderPdf (TC-13: dimensi PDF sesuai input)", () => {
  it("gelang LABEL 250×20 mm (template desain): 1 halaman per tamu, ukuran halaman = gelang", async () => {
    const o: PrintOptions = { paper: "LABEL", orientation: "PORTRAIT", widthMm: 250, heightMm: 20, marginMm: 0, gapXMm: 0, gapYMm: 0, columns: null, qrSizeMm: 21, theme: "DARK", fields };
    const { pdf, layout } = await renderPdf([item(1), item(2), item(3)], o);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(layout.perPage).toBe(1);
    const boxes = mediaBoxes(pdf);
    expect(boxes).toHaveLength(3);
    expect(pdf.toString("latin1")).toContain("/Subtype /Image"); // gambar desain ikut tertanam
    for (const [w, h] of boxes) {
      expect(w).toBeCloseTo(250 * MM_TO_PT, 1);
      expect(h).toBeCloseTo(20 * MM_TO_PT, 1);
    }
  });

  it("kartu di A4 landscape kustom: halaman A4 landscape, jumlah halaman sesuai grid", async () => {
    const o: PrintOptions = { paper: "A4", orientation: "LANDSCAPE", widthMm: 85.6, heightMm: 54, marginMm: 10, gapXMm: 5, gapYMm: 5, columns: null, qrSizeMm: 30, theme: "LIGHT", fields };
    const { pdf, layout } = await renderPdf(Array.from({ length: 10 }, (_, i) => item(i + 1)), o);
    expect(layout.perPage).toBe(9); // 3 kolom × 3 baris
    const boxes = mediaBoxes(pdf);
    expect(boxes).toHaveLength(2);
    expect(boxes[0][0]).toBeCloseTo(297 * MM_TO_PT, 1);
    expect(boxes[0][1]).toBeCloseTo(210 * MM_TO_PT, 1);
  });
});
