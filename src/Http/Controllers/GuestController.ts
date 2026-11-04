import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { requireUser } from "@/Http/Middleware/Authenticate";
import { GuestQuery, StoreGuestRequest, UpdateGuestRequest } from "@/Http/Requests/GuestRequest";
import { Guest } from "@/Models/Guest";
import { AuditLog } from "@/Models/AuditLog";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { action, body, idParam, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];
export const GUESTS_PER_PAGE = 50;

export const GuestController = {
  // GET /api/guests?q=&group=&status=&page=  (tamu pada event aktif)
  index: action(async (req) => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const query = GuestQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
    const { total, rows } = await Guest.paginate({ eventId: event.id, ...query, perPage: GUESTS_PER_PAGE });
    return json({ data: rows, meta: { total, page: query.page, perPage: GUESTS_PER_PAGE } });
  }),

  // POST /api/guests  (tambah manual ke event aktif)
  store: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const input = StoreGuestRequest.parse(await body(req));
    const guest = await db.$transaction(async (tx) => {
      const created = await Guest.create({ ...input, eventId: event.id }, tx);
      await AuditLog.record({ userId: user.id, action: "guest.create", entityType: "guest", entityId: created.id, after: created }, tx);
      return created;
    });
    return json({ data: guest }, 201);
  }),

  // PATCH /api/guests/:id  (ubah data; status CANCELLED = batalkan)
  update: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const input = UpdateGuestRequest.parse(await body(req));
    const guest = await db.$transaction(async (tx) => {
      const before = await tx.guest.findUniqueOrThrow({ where: { id } });
      const after = await Guest.update(id, input, tx);
      const act = input.status === "CANCELLED" && before.status !== "CANCELLED" ? "guest.cancel" : "guest.update";
      await AuditLog.record({ userId: user.id, action: act, entityType: "guest", entityId: id, before, after }, tx);
      return after;
    });
    return json({ data: guest });
  }),
};
