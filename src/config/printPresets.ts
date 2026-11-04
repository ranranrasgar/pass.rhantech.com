// Preset cetak bawaan (bisa diubah & disimpan sebagai preset kustom di halaman QR & Cetak).
import type { PrintOptions } from "@/Services/Print/renderPdf";

export type PresetOptions = PrintOptions;

const allFields = { eventName: true, name: true, group: true, code: true };
// Gelang: sama seperti desain — hanya QR, nama, dan entitas/grup.
const bandFields = { eventName: false, name: true, group: true, code: false };

export const BUILTIN_PRESETS: { key: string; name: string; options: PresetOptions }[] = [
  {
    key: "gelang",
    // Rasio desain gelang 1600 × 128 px = 12,5 : 1 -> 250 × 20 mm. ASUMSI ukuran fisik; sesuaikan.
    name: "Gelang 250 × 20 mm (1 per halaman)",
    options: { paper: "LABEL", orientation: "PORTRAIT", widthMm: 250, heightMm: 20, marginMm: 0, gapXMm: 0, gapYMm: 0, columns: null, qrSizeMm: 11.5, theme: "DARK", fields: bandFields },
  },
  {
    key: "gelang-a4",
    name: "Gelang 250 × 20 mm di A4 landscape",
    options: { paper: "A4", orientation: "LANDSCAPE", widthMm: 250, heightMm: 20, marginMm: 10, gapXMm: 0, gapYMm: 3, columns: null, qrSizeMm: 11.5, theme: "DARK", fields: bandFields },
  },
  {
    key: "kartu",
    name: "Kartu ID 85,6 × 54 mm di A4",
    options: { paper: "A4", orientation: "PORTRAIT", widthMm: 85.6, heightMm: 54, marginMm: 10, gapXMm: 5, gapYMm: 5, columns: null, qrSizeMm: 30, theme: "LIGHT", fields: allFields },
  },
  {
    key: "label",
    name: "Label 50 × 30 mm di A4",
    options: { paper: "A4", orientation: "PORTRAIT", widthMm: 50, heightMm: 30, marginMm: 8, gapXMm: 3, gapYMm: 3, columns: null, qrSizeMm: 24, theme: "LIGHT", fields: allFields },
  },
];
