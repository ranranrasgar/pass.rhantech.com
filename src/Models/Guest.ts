import "server-only";
import { db } from "@/lib/db";
import type { GuestStatus, Prisma } from "@/generated/prisma/client";
import { guestKey } from "@/Services/Import/validateImport";
import type { DbClient } from "./types";

// Namespace advisory lock PostgreSQL untuk penomoran kode tamu.
const GUEST_CODE_LOCK = 1001;

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
        // QR terakhir saja: aktif / dicabut / belum ada.
        include: { qrCredentials: { select: { isActive: true }, orderBy: { issuedAt: "desc" }, take: 1 } },
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

  /** guestKey(nama, grup) semua tamu event (termasuk yang dibatalkan). */
  async existingKeys(eventId: number, client: DbClient = db): Promise<Set<string>> {
    const rows = await client.guest.findMany({ where: { eventId }, select: { name: true, groupName: true } });
    return new Set(rows.map((r) => guestKey(r.name, r.groupName)));
  },

  /**
   * Nomor kode berikutnya untuk event (kode terbesar yang berupa angka + 1).
   * Di dalam transaksi, panggil lockCodes() dulu agar dua proses tidak memakai nomor yang sama.
   */
  async nextCodeNumber(eventId: number, client: DbClient = db): Promise<number> {
    const [row] = await client.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CASE WHEN external_code ~ '^[0-9]{1,9}$' THEN external_code::int END) AS max
      FROM guests WHERE event_id = ${eventId}::int`;
    return (row?.max ?? 0) + 1;
  },

  /** Kunci penomoran kode per event sampai transaksi selesai. */
  async lockCodes(eventId: number, client: DbClient) {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(${GUEST_CODE_LOCK}::int, ${eventId}::int)`;
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
