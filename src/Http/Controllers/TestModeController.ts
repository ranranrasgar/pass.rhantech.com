import "server-only";
import { z } from "zod";
import { Role } from "@/lib/roles";
import { requireUser } from "@/Http/Middleware/Authenticate";
import { clearTestData, setTestMode } from "@/Services/TestModeService";
import { action, body, idParam, json } from "./Controller";

// Mode Uji dikelola di Pengaturan -> hanya Super Admin.
const ONLY = [Role.SUPER_ADMIN];
const TestModeRequest = z.object({ enabled: z.boolean() });

export const TestModeController = {
  // POST /api/events/:id/test-mode  { enabled }  — false = akhiri & hapus data uji
  update: action(async (req, ctx) => {
    const user = await requireUser(ONLY);
    const id = await idParam(ctx);
    const { enabled } = TestModeRequest.parse(await body(req));
    return json({ data: await setTestMode(id, enabled, user.id) });
  }),

  // POST /api/events/:id/clear-test-data  — hapus data uji, mode uji tetap aktif
  clear: action(async (_req, ctx) => {
    const user = await requireUser(ONLY);
    const id = await idParam(ctx);
    return json({ data: await clearTestData(id, user.id) });
  }),
};
