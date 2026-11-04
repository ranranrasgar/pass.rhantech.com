import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { SetOfficersRequest, StoreGateRequest, UpdateGateRequest } from "@/Http/Requests/GateRequest";
import { Gate } from "@/Models/Gate";
import { AuditLog } from "@/Models/AuditLog";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { action, body, idParam, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];

export const GateController = {
  // GET /api/gates  (gate pada event aktif)
  index: action(async () => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    return json({ data: await Gate.forEvent(event.id) });
  }),

  // POST /api/gates
  store: action(async (req) => {
    const user = await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const input = StoreGateRequest.parse(await body(req));
    const gate = await db.$transaction(async (tx) => {
      const created = await Gate.create({ eventId: event.id, name: input.name }, tx);
      await AuditLog.record({ userId: user.id, action: "gate.create", entityType: "gate", entityId: created.id, after: created }, tx);
      return created;
    });
    return json({ data: gate }, 201);
  }),

  // PATCH /api/gates/:id  (ubah nama, aktif/nonaktif)
  update: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const input = UpdateGateRequest.parse(await body(req));
    const gate = await db.$transaction(async (tx) => {
      const before = await tx.gate.findUniqueOrThrow({ where: { id } });
      const after = await Gate.update(id, input, tx);
      await AuditLog.record({ userId: user.id, action: "gate.update", entityType: "gate", entityId: id, before, after }, tx);
      return after;
    });
    return json({ data: gate });
  }),

  // PUT /api/gates/:id/officers  { userIds }  — ganti daftar petugas gate
  setOfficers: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const { userIds } = SetOfficersRequest.parse(await body(req));
    const officers = await db.user.count({ where: { id: { in: userIds }, role: Role.GATE_OFFICER, isActive: true } });
    if (officers !== userIds.length) throw new HttpError(422, "Hanya pengguna aktif dengan role Petugas Gate yang bisa ditugaskan");

    await db.$transaction(async (tx) => {
      const before = await tx.gateAssignment.findMany({ where: { gateId: id }, select: { userId: true } });
      if (!(await tx.gate.findUnique({ where: { id } }))) throw new HttpError(404, "Gate tidak ditemukan");
      await Gate.setOfficers(id, userIds, tx);
      await AuditLog.record(
        { userId: user.id, action: "gate.set_officers", entityType: "gate", entityId: id, before: before.map((b) => b.userId), after: userIds },
        tx,
      );
    });
    return json({ data: await Gate.find(id) });
  }),
};
