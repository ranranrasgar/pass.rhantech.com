import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "./types";

const withOfficers = {
  assignments: { select: { user: { select: { id: true, name: true, isActive: true } } } },
} satisfies Prisma.GateInclude;

export type GateWithOfficers = Prisma.GateGetPayload<{ include: typeof withOfficers }>;

export const Gate = {
  forEvent(eventId: number): Promise<GateWithOfficers[]> {
    return db.gate.findMany({ where: { eventId }, include: withOfficers, orderBy: { name: "asc" } });
  },

  find(id: number) {
    return db.gate.findUnique({ where: { id }, include: withOfficers });
  },

  create(data: { eventId: number; name: string }, client: DbClient = db) {
    return client.gate.create({ data });
  },

  update(id: number, data: Prisma.GateUpdateInput, client: DbClient = db) {
    return client.gate.update({ where: { id }, data });
  },

  /** Ganti seluruh daftar petugas sebuah gate. */
  async setOfficers(gateId: number, userIds: number[], client: DbClient = db) {
    await client.gateAssignment.deleteMany({ where: { gateId } });
    if (userIds.length) {
      await client.gateAssignment.createMany({ data: userIds.map((userId) => ({ gateId, userId })) });
    }
  },
};
