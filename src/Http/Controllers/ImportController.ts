import "server-only";
import { Role } from "@/lib/roles";
import { requireUser } from "@/Http/Middleware/Authenticate";
import { ImportBatch } from "@/Models/ImportBatch";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { analyzeImport, commitImport, parseImportForm } from "@/Services/Import/ImportService";
import { action, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];
const SAMPLE_VALID_ROWS = 20;

export const ImportController = {
  // GET /api/imports  (riwayat impor event aktif)
  index: action(async () => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    return json({ data: await ImportBatch.forEvent(event.id) });
  }),

  // POST /api/imports/preview  (multipart: file, sheet?, mapping?) — tidak menyimpan apa pun
  preview: action(async (req) => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const { rows, ...analysis } = await analyzeImport(event.id, await parseImportForm(req));
    return json({
      data: {
        ...analysis,
        event: { id: event.id, name: event.name },
        problems: rows.filter((r) => r.status !== "valid"),
        sample: rows.filter((r) => r.status === "valid").slice(0, SAMPLE_VALID_ROWS),
      },
    });
  }),

  // POST /api/imports/commit  (multipart sama dengan preview) — simpan baris valid
  commit: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    return json({ data: await commitImport(event.id, user.id, await parseImportForm(req)) }, 201);
  }),
};
