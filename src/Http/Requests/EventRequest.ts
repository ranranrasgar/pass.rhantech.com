import { z } from "zod";
import { EventStatus } from "@/generated/prisma/enums";

const name = z.string().trim().min(1, "Nama event wajib diisi").max(191);
const venueName = z.string().trim().min(1, "Venue wajib diisi").max(191);
// Tanggal lokal (APP_TIMEZONE) dari input type=date.
const eventDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid (YYYY-MM-DD)");
const status = z.enum(EventStatus, { error: "Status tidak valid" });

export const StoreEventRequest = z.object({ name, venueName, eventDate, status: status.default("DRAFT") });

export const UpdateEventRequest = z
  .object({ name, venueName, eventDate, status })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan");

export const ActiveEventRequest = z.object({ eventId: z.coerce.number().int().positive() });
