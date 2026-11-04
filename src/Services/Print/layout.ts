// Perhitungan tata letak cetak dalam milimeter (murni, tanpa PDF/DB).
export type Paper = "A4" | "LETTER" | "LABEL";
export type Orientation = "PORTRAIT" | "LANDSCAPE";

export const PAPER_MM: Record<Exclude<Paper, "LABEL">, [number, number]> = {
  A4: [210, 297],
  LETTER: [215.9, 279.4],
};

export const MM_TO_PT = 72 / 25.4;

export type LayoutInput = {
  paper: Paper;
  orientation: Orientation;
  widthMm: number;
  heightMm: number;
  marginMm: number; // tepi lembar (A4/LETTER); diabaikan untuk LABEL
  gapXMm: number;
  gapYMm: number;
  columns: number | null; // null = otomatis (sebanyak yang muat)
};

export type Layout = {
  pageWidthMm: number;
  pageHeightMm: number;
  columns: number;
  rows: number;
  perPage: number;
};

export class LayoutError extends Error {}

const fit = (avail: number, size: number, gap: number) => Math.floor((avail + gap + 1e-9) / (size + gap));

export function computeLayout(input: LayoutInput): Layout {
  const { widthMm: w, heightMm: h } = input;
  if (!(w > 0 && h > 0)) throw new LayoutError("Lebar dan tinggi label harus lebih dari 0");
  if (input.paper === "LABEL") {
    // Satu label per halaman; ukuran halaman = ukuran label (printer label/gelang).
    return { pageWidthMm: w, pageHeightMm: h, columns: 1, rows: 1, perPage: 1 };
  }
  const [pw, ph] = PAPER_MM[input.paper];
  const [pageWidthMm, pageHeightMm] = input.orientation === "LANDSCAPE" ? [ph, pw] : [pw, ph];
  const availW = pageWidthMm - 2 * input.marginMm;
  const availH = pageHeightMm - 2 * input.marginMm;
  const maxCols = fit(availW, w, input.gapXMm);
  const rows = fit(availH, h, input.gapYMm);
  if (maxCols < 1 || rows < 1) throw new LayoutError("Label tidak muat di kertas dengan margin ini");
  const columns = input.columns ?? maxCols;
  if (columns < 1 || columns > maxCols) throw new LayoutError(`Maksimal ${maxCols} kolom untuk ukuran ini`);
  return { pageWidthMm, pageHeightMm, columns, rows, perPage: columns * rows };
}

/** Posisi pojok kiri-atas label ke-`index` (0-based), dalam mm. */
export function labelPosition(layout: Layout, input: LayoutInput, index: number) {
  const page = Math.floor(index / layout.perPage);
  if (input.paper === "LABEL") return { page, xMm: 0, yMm: 0 };
  const slot = index % layout.perPage;
  const col = slot % layout.columns;
  const row = Math.floor(slot / layout.columns);
  return {
    page,
    xMm: input.marginMm + col * (input.widthMm + input.gapXMm),
    yMm: input.marginMm + row * (input.heightMm + input.gapYMm),
  };
}

export function pageCount(layout: Layout, count: number): number {
  return Math.ceil(count / layout.perPage);
}

/**
 * Daftar kode "0001-0100, 0150" -> predikat untuk kode tamu.
 * Kode dibandingkan sebagai angka (0001 == 1).
 */
export function parseCodeList(text: string): (code: string | null) => boolean {
  const ranges: [number, number][] = [];
  for (const part of text.split(/[,;\s]+/).filter(Boolean)) {
    const m = /^(\d{1,9})(?:-(\d{1,9}))?$/.exec(part);
    if (!m) throw new LayoutError(`Kode tidak valid: "${part}" (contoh: 0001-0100, 0150)`);
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    ranges.push(a <= b ? [a, b] : [b, a]);
  }
  if (!ranges.length) throw new LayoutError("Isi daftar kode, contoh: 0001-0100, 0150");
  return (code) => {
    if (!code || !/^\d{1,9}$/.test(code)) return false;
    const n = Number(code);
    return ranges.some(([a, b]) => n >= a && n <= b);
  };
}
