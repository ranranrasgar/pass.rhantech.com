import { z } from "zod";

const mm = (min: number, max: number, label: string) =>
  z.coerce.number({ error: `${label} harus angka` }).min(min, `${label} minimal ${min} mm`).max(max, `${label} maksimal ${max} mm`);

export const PrintOptionsSchema = z.object({
  paper: z.enum(["A4", "LETTER", "LABEL"]),
  orientation: z.enum(["PORTRAIT", "LANDSCAPE"]),
  widthMm: mm(10, 1000, "Lebar"),
  heightMm: mm(10, 1000, "Tinggi"),
  marginMm: mm(0, 50, "Margin"),
  gapXMm: mm(0, 50, "Jarak horizontal"),
  gapYMm: mm(0, 50, "Jarak vertikal"),
  columns: z.coerce.number().int().min(1).max(30).nullable(),
  qrSizeMm: mm(8, 200, "Ukuran QR"),
  theme: z.enum(["LIGHT", "DARK"]),
  fields: z.object({ eventName: z.boolean(), name: z.boolean(), group: z.boolean(), code: z.boolean() }),
});

export const PrintSelection = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("all") }),
  z.object({ scope: z.literal("group"), group: z.string().trim().min(1, "Pilih grup") }),
  z.object({ scope: z.literal("codes"), codes: z.string().trim().min(1, "Isi daftar kode").max(2000) }),
]);

export const PrintRequest = z.object({
  selection: PrintSelection,
  options: PrintOptionsSchema,
  preview: z.boolean().default(false),
});

export const PresetRequest = z.object({
  name: z.string().trim().min(1, "Nama preset wajib diisi").max(100),
  options: PrintOptionsSchema,
});

const reason = z.string().trim().min(3, "Alasan minimal 3 karakter").max(500);
export const IssueQrRequest = z.object({ reason: reason.nullable().optional().transform((r) => r ?? null) });
export const RevokeQrRequest = z.object({ reason });
