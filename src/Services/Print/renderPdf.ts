// Render label/kartu/gelang ke PDF (pdfkit). Ukuran dalam mm -> point.
// QR digambar sebagai vektor dengan quiet zone 4 modul (PRD §10.2).
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { computeLayout, labelPosition, MM_TO_PT, type LayoutInput } from "./layout";

export type PrintFields = { eventName: boolean; name: boolean; group: boolean; code: boolean };
export type PrintTheme = "LIGHT" | "DARK";
export type PrintOptions = LayoutInput & { qrSizeMm: number; theme: PrintTheme; fields: PrintFields };
export type PrintItem = { eventName: string; name: string; group: string; code: string; token: string };

const QUIET_MODULES = 4;
const GOLD = "#D4A63A";
const BLACK = "#121212";
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

/** Gaya gelang tamu: latar hitam, judul emas, QR di kotak putih, label nama emas. */
function drawDark(doc: PDFKit.PDFDocument, item: PrintItem, o: PrintOptions, b: Box) {
  const pad = Math.min(pt(2), b.h * 0.1);
  doc.rect(b.x, b.y, b.w, b.h).fill(BLACK);
  const t = textLines(item, o.fields);
  const qr = Math.min(pt(o.qrSizeMm), b.h - 2 * pad);
  const tagW = t.name || t.sub ? Math.min(b.w * 0.32, pt(75)) : 0;
  const tagH = Math.min(b.h - 2 * pad, qr * 0.62);
  const tagX = b.x + b.w - pad - tagW;
  const qrX = tagX - (tagW ? pad : 0) - qr;
  doc.roundedRect(qrX - pt(0.8), b.y + (b.h - qr) / 2 - pt(0.8), qr + pt(1.6), qr + pt(1.6), pt(1.2)).fill("#FFFFFF");
  drawQr(doc, item.token, qrX, b.y + (b.h - qr) / 2, qr);

  if (tagW) {
    const tagY = b.y + (b.h - tagH) / 2;
    doc.roundedRect(tagX, tagY, tagW, tagH, tagH / 2).fill(GOLD);
    const s = Math.max(5.5, Math.min(11, tagH * 0.3));
    drawStack(doc, { x: tagX + tagH * 0.35, y: tagY, w: tagW - tagH * 0.7, h: tagH }, [
      [t.name, "Helvetica-Bold", s, BLACK],
      [t.sub, "Helvetica", s * 0.85, BLACK],
    ]);
  }
  if (t.title) {
    const left = { x: b.x + pad, y: b.y, w: qrX - b.x - 2 * pad, h: b.h };
    const s = Math.max(7, Math.min(24, b.h * 0.3));
    doc.font("Helvetica-Bold").fontSize(s).fillColor(GOLD);
    const title = fitText(doc, t.title.toUpperCase(), left.w);
    doc.text(title, left.x + (left.w - doc.widthOfString(title)) / 2, left.y + (left.h - s) / 2, { lineBreak: false });
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
    if (o.theme === "DARK") drawDark(doc, item, o, box);
    else drawLight(doc, item, o, box);
  });
  doc.end();
  return { pdf: await done, layout };
}
