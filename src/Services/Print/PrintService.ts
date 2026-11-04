import "server-only";
import type { z } from "zod";
import { db } from "@/lib/db";
import { decryptToken } from "@/lib/qr";
import { HttpError } from "@/Http/Middleware/Authenticate";
import type { PrintSelection } from "@/Http/Requests/PrintRequest";
import { LayoutError, parseCodeList } from "./layout";
import type { PrintItem } from "./renderPdf";

export const MAX_LABELS = 3000;

/**
 * Tamu ACTIVE sesuai pilihan + token QR aktif (didekripsi untuk dicetak).
 * Tamu tanpa QR aktif dilewati dan dihitung di `skippedNoQr`.
 */
export async function printItems(event: { id: number; name: string }, selection: z.infer<typeof PrintSelection>) {
  let match: ((code: string | null) => boolean) | null = null;
  if (selection.scope === "codes") {
    try {
      match = parseCodeList(selection.codes);
    } catch (err) {
      if (err instanceof LayoutError) throw new HttpError(422, err.message);
      throw err;
    }
  }
  const guests = await db.guest.findMany({
    where: { eventId: event.id, status: "ACTIVE", groupName: selection.scope === "group" ? selection.group : undefined },
    select: {
      name: true,
      groupName: true,
      externalCode: true,
      qrCredentials: { where: { isActive: true }, select: { tokenEncrypted: true }, take: 1 },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  const selected = match ? guests.filter((g) => match(g.externalCode)) : guests;

  const items: PrintItem[] = [];
  let skippedNoQr = 0;
  for (const g of selected) {
    const enc = g.qrCredentials[0]?.tokenEncrypted;
    if (!enc) {
      skippedNoQr++;
      continue;
    }
    items.push({ eventName: event.name, name: g.name, group: g.groupName, code: g.externalCode ?? "", token: decryptToken(enc) });
  }
  if (items.length > MAX_LABELS) throw new HttpError(422, `Maksimal ${MAX_LABELS} label per PDF; persempit pilihan`);
  return { items, skippedNoQr, selected: selected.length };
}
