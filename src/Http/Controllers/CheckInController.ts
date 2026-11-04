import "server-only";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { ScanRequest } from "@/Http/Requests/ScanRequest";
import { scan } from "@/Services/CheckInService";
import { checkGateAccess, SCAN_ROLES } from "@/Services/GateAccessService";
import { action, body, json } from "./Controller";

export const CheckInController = {
  // POST /api/check-in/scan  { token, gateId }  — petugas dari sesi, bukan dari body.
  scan: action(async (req) => {
    const user = await requireUser(SCAN_ROLES);
    const { token, gateId } = ScanRequest.parse(await body(req));
    const access = await checkGateAccess(user, gateId);
    if (!access.ok) throw new HttpError(access.status, access.message);
    return json(await scan(token, access.gate, user.id));
  }),

  // GET /api/check-in/ping  — indikator koneksi di halaman scan.
  ping: action(async () => {
    await requireUser(SCAN_ROLES);
    return json({ ok: true, serverTime: new Date().toISOString() });
  }),
};
