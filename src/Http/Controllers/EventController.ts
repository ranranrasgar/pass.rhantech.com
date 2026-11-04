import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { localDateToUtc } from "@/lib/time";
import { requireUser } from "@/Http/Middleware/Authenticate";
import { StoreEventRequest, UpdateEventRequest } from "@/Http/Requests/EventRequest";
import { Event } from "@/Models/Event";
import { AuditLog } from "@/Models/AuditLog";
import { action, body, idParam, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];

export const EventController = {
  // GET /api/events
  index: action(async () => {
    await requireUser(MANAGERS);
    return json({ data: await Event.all() });
  }),

  // POST /api/events
  store: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const input = StoreEventRequest.parse(await body(req));
    const event = await db.$transaction(async (tx) => {
      const created = await Event.create({ ...input, eventDate: localDateToUtc(input.eventDate) }, tx);
      await AuditLog.record(
        { userId: user.id, action: "event.create", entityType: "event", entityId: created.id, after: created },
        tx,
      );
      return created;
    });
    return json({ data: event }, 201);
  }),

  // PATCH /api/events/:id  (menonaktifkan event = status CLOSED)
  update: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const input = UpdateEventRequest.parse(await body(req));
    const event = await db.$transaction(async (tx) => {
      const before = await tx.event.findUniqueOrThrow({ where: { id } });
      const after = await Event.update(
        id,
        { ...input, eventDate: input.eventDate ? localDateToUtc(input.eventDate) : undefined },
        tx,
      );
      await AuditLog.record(
        { userId: user.id, action: "event.update", entityType: "event", entityId: id, before, after },
        tx,
      );
      return after;
    });
    return json({ data: event });
  }),
};
