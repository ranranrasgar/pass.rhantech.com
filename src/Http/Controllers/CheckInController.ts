import "server-only";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { GuestSearchQuery, ManualCheckInRequest, ScanRequest } from "@/Http/Requests/ScanRequest";
import { manualCheckIn, scan, searchGuests } from "@/Services/CheckInService";
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

  // GET /api/check-in/guests?gateId=&q=  — cari tamu untuk absen manual (event gate saja).
  guests: action(async (req) => {
    const user = await requireUser(SCAN_ROLES);
    const { gateId, q } = GuestSearchQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
    const access = await checkGateAccess(user, gateId);
    if (!access.ok) throw new HttpError(access.status, access.message);
    return json({ data: await searchGuests(access.gate.eventId, q) });
  }),

  // POST /api/check-in/manual  { guestId, gateId, reason, identityChecked: true }
  // Tamu tidak membawa gelang. Petugas dari sesi; tercatat method MANUAL + audit log.
  manual: action(async (req) => {
    const user = await requireUser(SCAN_ROLES);
    const { guestId, gateId, reason } = ManualCheckInRequest.parse(await body(req));
    const access = await checkGateAccess(user, gateId);
    if (!access.ok) throw new HttpError(access.status, access.message);
    return json(await manualCheckIn(guestId, access.gate, user.id, reason));
  }),

  // GET /api/check-in/ping  — indikator koneksi di halaman scan.
  ping: action(async () => {
    await requireUser(SCAN_ROLES);
    return json({ ok: true, serverTime: new Date().toISOString() });
  }),
};
