import "server-only";
import { db } from "@/lib/db";
import type { GuestStatus, Prisma } from "@/generated/prisma/client";
import type { DbClient } from "./types";

export type GuestFilter = {
  eventId: number;
  q?: string;
  group?: string;
  status?: GuestStatus;
  page: number;
  perPage: number;
};

function where(f: Omit<GuestFilter, "page" | "perPage">): Prisma.GuestWhereInput {
  return {
    eventId: f.eventId,
    groupName: f.group || undefined,
    status: f.status,
    OR: f.q
      ? [
          { name: { contains: f.q, mode: "insensitive" } },
          { externalCode: { contains: f.q, mode: "insensitive" } },
        ]
      : undefined,
  };
}

export const Guest = {
  async paginate(f: GuestFilter) {
    const w = where(f);
    const [total, rows] = await Promise.all([
      db.guest.count({ where: w }),
      db.guest.findMany({
        where: w,
        // external_code berupa teks; urutkan waktu dibuat lalu id agar urutan impor terjaga.
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
      }),
    ]);
    return { total, rows };
  },

  find(id: number) {
    return db.guest.findUnique({ where: { id } });
  },

  async groups(eventId: number): Promise<string[]> {
    const rows = await db.guest.findMany({ where: { eventId }, distinct: ["groupName"], select: { groupName: true }, orderBy: { groupName: "asc" } });
    return rows.map((r) => r.groupName);
  },

  async existingCodes(eventId: number): Promise<Set<string>> {
    const rows = await db.guest.findMany({ where: { eventId, externalCode: { not: null } }, select: { externalCode: true } });
    return new Set(rows.map((r) => r.externalCode!));
  },

  create(data: Prisma.GuestUncheckedCreateInput, client: DbClient = db) {
    return client.guest.create({ data });
  },

  update(id: number, data: Prisma.GuestUpdateInput, client: DbClient = db) {
    return client.guest.update({ where: { id }, data });
  },

  /** Jumlah tamu AKTIF per grup untuk dashboard. */
  async countByGroup(eventId: number): Promise<{ group: string; count: number }[]> {
    const rows = await db.guest.groupBy({
      by: ["groupName"],
      where: { eventId, status: "ACTIVE" },
      _count: { _all: true },
      orderBy: { groupName: "asc" },
    });
    return rows.map((r) => ({ group: r.groupName, count: r._count._all }));
  },

  countCancelled(eventId: number) {
    return db.guest.count({ where: { eventId, status: "CANCELLED" } });
  },
};
