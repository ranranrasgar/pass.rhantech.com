import "server-only";
import { db } from "@/lib/db";

export const CheckIn = {
  /** Ringkasan kehadiran event: hanya tamu ACTIVE yang dihitung. */
  async summary(eventId: number) {
    const [registered, present, perGate] = await Promise.all([
      db.guest.count({ where: { eventId, status: "ACTIVE" } }),
      db.checkIn.count({ where: { eventId, guest: { status: "ACTIVE" } } }),
      db.checkIn.groupBy({ by: ["gateId"], where: { eventId }, _count: { _all: true } }),
    ]);
    const gates = await db.gate.findMany({ where: { eventId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
    const byGate = new Map(perGate.map((g) => [g.gateId, g._count._all]));
    return {
      registered,
      present,
      absent: registered - present,
      percent: registered ? Math.round((present / registered) * 1000) / 10 : 0,
      perGate: gates.map((g) => ({ gate: g.name, count: byGate.get(g.id) ?? 0 })),
    };
  },

  latest(eventId: number, take = 10) {
    return db.checkIn.findMany({
      where: { eventId },
      select: {
        checkedInAt: true,
        guest: { select: { name: true, groupName: true, externalCode: true } },
        gate: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { checkedInAt: "desc" },
      take,
    });
  },
};
