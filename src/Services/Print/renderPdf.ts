// Render label/kartu/gelang ke PDF (pdfkit). Ukuran dalam mm -> point.
// QR digambar sebagai vektor dengan quiet zone 4 modul (PRD §10.2).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { computeLayout, labelPosition, MM_TO_PT, type LayoutInput } from "./layout";

export type PrintFields = { eventName: boolean; name: boolean; group: boolean; code: boolean };
export type PrintTheme = "LIGHT" | "DARK";
export type PrintOptions = LayoutInput & { qrSizeMm: number; theme: PrintTheme; fields: PrintFields };
export type PrintItem = { eventName: string; name: string; group: string; code: string; token: string };

const QUIET_MODULES = 4;
const pt = (mm: number) => mm * MM_TO_PT;

/** QR + quiet zone di (x, y) berukuran `size` pt (sudah termasuk quiet zone). */
function drawQr(doc: PDFKit.PDFDocument, token: string, x: number, y: number, size: number) {
  const { modules } = QRCode.create(token, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const m = size / (n + 2 * QUIET_MODULES);
  doc.rect(x, y, size, size).fill("#FFFFFF");
  const ox = x + QUIET_MODULES * m;
  const oy = y + QUIET_MODULES * m;
  for (let r = 0; r < n; r++) {
    // Gabungkan modul gelap yang berurutan dalam satu baris -> PDF lebih kecil.
    for (let c = 0; c < n; c++) {
      if (!modules.get(r, c)) continue;
      let run = 1;
      while (c + run < n && modules.get(r, c + run)) run++;
      doc.rect(ox + c * m, oy + r * m, run * m + 0.01, m + 0.01);
      c += run - 1;
    }
  }
  doc.fill("#000000");
}

type Box = { x: number; y: number; w: number; h: number };

function textLines(item: PrintItem, f: PrintFields) {
  return {
    title: f.eventName ? item.eventName : "",
    name: f.name ? item.name : "",
    sub: [f.code ? item.code : "", f.group ? item.group : ""].filter(Boolean).join(" · "),
  };
}

/** Potong teks dengan "…" agar muat satu baris selebar `maxW` (font harus sudah diset). */
function fitText(doc: PDFKit.PDFDocument, text: string, maxW: number): string {
  if (doc.widthOfString(text) <= maxW) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(text.slice(0, mid).trimEnd() + "…") <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + "…";
}

/** Tumpukan teks rata kiri, di tengah vertikal kotak. */
function drawStack(doc: PDFKit.PDFDocument, box: Box, lines: [string, string, number, string][]) {
  const used = lines.filter(([text]) => text);
  const total = used.reduce((s, [, , size]) => s + size * 1.25, 0);
  let y = box.y + (box.h - total) / 2;
  for (const [text, font, size, color] of used) {
    // Kecilkan font dulu (maks. 30%) sebelum memotong teks panjang.
    let fs = size;
    doc.font(font).fontSize(fs).fillColor(color);
    while (fs > size * 0.7 && doc.widthOfString(text) > box.w) doc.fontSize((fs -= 0.25));
    doc.text(fitText(doc, text, box.w), box.x, y + (size - fs) / 2, { lineBreak: false });
    y += size * 1.25;
  }
}

function drawLight(doc: PDFKit.PDFDocument, item: PrintItem, o: PrintOptions, b: Box) {
  const pad = Math.min(pt(2.5), b.h * 0.08);
  const qr = Math.min(pt(o.qrSizeMm), b.h - 2 * pad, b.w - 2 * pad);
  doc.rect(b.x, b.y, b.w, b.h).lineWidth(0.3).strokeColor("#BBBBBB").stroke(); // garis potong
  drawQr(doc, item.token, b.x + pad, b.y + (b.h - qr) / 2, qr);
  const tx = b.x + 2 * pad + qr;
  const s = Math.max(6, Math.min(13, b.h * 0.105));
  const t = textLines(item, o.fields);
  drawStack(doc, { x: tx, y: b.y + pad, w: b.x + b.w - pad - tx, h: b.h - 2 * pad }, [
    [t.title, "Helvetica", s * 0.8, "#555555"],
    [t.name, "Helvetica-Bold", s, "#000000"],
    [t.sub, "Helvetica", s * 0.85, "#333333"],
  ]);
}

// Template gelang = desain asli tamu (docs/WhatsApp Image ...) yang sudah dibersihkan
// dari QR & nama contoh. Posisi di bawah dalam piksel gambar 1600 × 128.
const TEMPLATE = { w: 1600, h: 128 };
const T = {
  qr: { cx: 1162, cy: 64, size: 74 }, // kotak putih bagian dalam
  textX: 1222,
  textMaxX: 1428, // sampai sebelum ujung membulat label emas
  nameBaseline: 59,
  line: { y: 64, x0: 1212, x1: 1416, h: 1.2 },
  subBaseline: 77,
  capHeight: 9,
};
const TEXT_DARK = "#1B1406";
let templatePng: Buffer | null = null;
// Gambar dimuat SEKALI per dokumen lalu dipakai ulang (tanpa ini tiap halaman menanam ulang ~135 KB).
// `openImage` ada di pdfkit tetapi belum ada di @types/pdfkit; doc.image() menerima hasilnya.
type OpenImage = { openImage(src: Buffer): unknown };
const templateImage = new WeakMap<PDFKit.PDFDocument, unknown>();
function template(doc: PDFKit.PDFDocument): Buffer {
  templatePng ??= readFileSync(join(process.cwd(), "src/Services/Print/assets/gelang-template.png"));
  if (!templateImage.has(doc)) templateImage.set(doc, (doc as unknown as OpenImage).openImage(templatePng));
  return templateImage.get(doc) as Buffer;
}

/** Tema gelang: gambar desain asli + QR, nama, entitas/grup (yang berubah per tamu). */
function drawTemplate(doc: PDFKit.PDFDocument, item: PrintItem, o: PrintOptions, b: Box) {
  const sx = b.w / TEMPLATE.w;
  const sy = b.h / TEMPLATE.h;
  doc.image(template(doc), b.x, b.y, { width: b.w, height: b.h });

  const qr = T.qr.size * Math.min(sx, sy); // tetap persegi walau rasio label berbeda
  drawQr(doc, item.token, b.x + T.qr.cx * sx - qr / 2, b.y + T.qr.cy * sy - qr / 2, qr);

  doc.rect(b.x + T.line.x0 * sx, b.y + (T.line.y - T.line.h / 2) * sy, (T.line.x1 - T.line.x0) * sx, T.line.h * sy).fill(TEXT_DARK);

  const size = (T.capHeight / 0.718) * sy; // tinggi huruf kapital Helvetica = 0,718 em
  const maxW = (T.textMaxX - T.textX) * sx;
  const sub = [o.fields.code ? item.code : "", o.fields.group ? item.group : ""].filter(Boolean).join(" · ");
  const lines: [string, number][] = [
    [o.fields.name ? item.name : "", T.nameBaseline],
    [sub, T.subBaseline],
  ];
  for (const [text, baseline] of lines) {
    if (!text) continue;
    let fs = size;
    doc.font("Helvetica-Bold").fontSize(fs).fillColor(TEXT_DARK);
    const upper = text.toUpperCase();
    while (fs > size * 0.6 && doc.widthOfString(upper) > maxW) doc.fontSize((fs -= 0.1));
    // pdfkit menaruh teks dari atas kotak baris; baseline = y + ascender (0,718 em).
    doc.text(fitText(doc, upper, maxW), b.x + T.textX * sx, b.y + baseline * sy - 0.718 * fs, { lineBreak: false });
  }
}

/** Buat PDF lengkap. Mengembalikan Buffer + info layout. */
export async function renderPdf(items: PrintItem[], o: PrintOptions, title = "VenuePass") {
  const layout = computeLayout(o);
  const size: [number, number] = [pt(layout.pageWidthMm), pt(layout.pageHeightMm)];
  const doc = new PDFDocument({ autoFirstPage: false, margin: 0, compress: true, info: { Title: title, Creator: "VenuePass" } });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  items.forEach((item, i) => {
    const pos = labelPosition(layout, o, i);
    if (i % layout.perPage === 0) doc.addPage({ size, margin: 0 });
    const box = { x: pt(pos.xMm), y: pt(pos.yMm), w: pt(o.widthMm), h: pt(o.heightMm) };
    if (o.theme === "DARK") drawTemplate(doc, item, o, box);
    else drawLight(doc, item, o, box);
  });
  doc.end();
  return { pdf: await done, layout };
}
