import { z } from "zod";
import { GuestStatus } from "@/generated/prisma/enums";

const clean = (max: number) => z.string().transform((s) => s.replace(/\s+/g, " ").trim()).pipe(z.string().max(max));

const name = clean(191).pipe(z.string().min(1, "Nama wajib diisi"));
const groupName = clean(100).pipe(z.string().min(1, "Grup wajib diisi"));
// Kode tamu opsional untuk tamu manual; string kosong -> null.
const externalCode = clean(100).transform((s) => (s === "" ? null : s));
const notes = z.string().trim().max(1000).transform((s) => (s === "" ? null : s));

export const StoreGuestRequest = z.object({
  name,
  groupName,
  externalCode: externalCode.optional().prefault(""),
  notes: notes.optional().prefault(""),
});

export const UpdateGuestRequest = z
  .object({ name, groupName, externalCode, notes, status: z.enum(GuestStatus, { error: "Status tidak valid" }) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

export const GuestQuery = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  group: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(GuestStatus).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});
