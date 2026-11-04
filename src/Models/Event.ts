import "server-only";
import { db } from "@/lib/db";
import type { EventStatus, Prisma } from "@/generated/prisma/client";
import type { DbClient } from "./types";

export type EventRow = Prisma.EventGetPayload<object>;

export const Event = {
  all(): Promise<EventRow[]> {
    return db.event.findMany({ orderBy: [{ eventDate: "desc" }, { id: "desc" }] });
  },

  find(id: number): Promise<EventRow | null> {
    return db.event.findUnique({ where: { id } });
  },

  create(data: Prisma.EventCreateInput, client: DbClient = db) {
    return client.event.create({ data });
  },

  update(id: number, data: Prisma.EventUpdateInput, client: DbClient = db) {
    return client.event.update({ where: { id }, data });
  },

  async countByStatus(): Promise<Record<EventStatus, number>> {
    const rows = await db.event.groupBy({ by: ["status"], _count: { _all: true } });
    const result = { DRAFT: 0, ACTIVE: 0, CLOSED: 0 };
    for (const r of rows) result[r.status] = r._count._all;
    return result;
  },
};
