import "server-only";
import { Role } from "@/lib/roles";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { PresetRequest, PrintRequest } from "@/Http/Requests/PrintRequest";
import { AuditLog } from "@/Models/AuditLog";
import { PrintPreset } from "@/Models/PrintPreset";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { computeLayout, LayoutError } from "@/Services/Print/layout";
import { printItems } from "@/Services/Print/PrintService";
import { renderPdf } from "@/Services/Print/renderPdf";
import { action, body, idParam, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];

export const PrintController = {
  // POST /api/print/pdf  { selection, options, preview }  -> application/pdf
  pdf: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const { selection, options, preview } = PrintRequest.parse(await body(req));
    let layout;
    try {
      layout = computeLayout(options);
    } catch (err) {
      if (err instanceof LayoutError) throw new HttpError(422, err.message);
      throw err;
    }
    const { items, skippedNoQr, selected } = await printItems(event, selection);
    if (items.length === 0) {
      throw new HttpError(422, selected ? "Tamu terpilih belum punya QR. Buat QR terlebih dahulu." : "Tidak ada tamu aktif yang cocok dengan pilihan");
    }
    // Pratinjau = halaman pertama saja.
    const printed = preview ? items.slice(0, layout.perPage) : items;
    const { pdf } = await renderPdf(printed, options, `QR ${event.name}`);
    if (!preview) {
      await AuditLog.record({
        userId: user.id,
        action: "qr.print",
        entityType: "event",
        entityId: event.id,
        after: { labels: items.length, skippedNoQr, selection, options },
      });
    }
    const safe = event.name.replace(/[^\w.-]+/g, "_");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="qr-${safe}.pdf"`,
        "Cache-Control": "no-store",
        "X-Label-Count": String(items.length),
        "X-Skipped-No-Qr": String(skippedNoQr),
        "X-Per-Page": String(layout.perPage),
      },
    });
  }),

  // GET /api/print-presets
  presets: action(async () => {
    await requireUser(MANAGERS);
    return json({ data: await PrintPreset.all() });
  }),

  // POST /api/print-presets  { name, options }  (nama sama = timpa)
  savePreset: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const { name, options } = PresetRequest.parse(await body(req));
    const preset = await PrintPreset.upsert(name, options);
    await AuditLog.record({ userId: user.id, action: "print_preset.save", entityType: "print_preset", entityId: preset.id, after: { name, options } });
    return json({ data: { id: preset.id, name } }, 201);
  }),

  // DELETE /api/print-presets/:id
  deletePreset: action(async (_req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const removed = await PrintPreset.delete(id);
    await AuditLog.record({ userId: user.id, action: "print_preset.delete", entityType: "print_preset", entityId: id, before: removed });
    return json({ data: { ok: true } });
  }),
};
