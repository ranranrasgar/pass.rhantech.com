import "server-only";
import { db } from "@/lib/db";
import type { Prisma, ScanResult } from "@/generated/prisma/client";

export type ScanLogFilter = {
  eventId: number;
  result?: ScanResult;
  gateId?: number;
  userId?: number;
  from?: Date;
  to?: Date;
  page: number;
  perPage: number;
};

export const ScanLog = {
  /** Token mentah TIDAK PERNAH disimpan; hanya sidik jari (awal sha256). */
  record(data: { eventId: number; gateId: number | null; userId: number | null; tokenFingerprint: string | null; result: ScanResult; message: string }) {
    return db.scanLog.create({ data: { ...data, message: data.message.slice(0, 255) } });
  },

  async paginate(f: ScanLogFilter) {
    const where: Prisma.ScanLogWhereInput = {
      eventId: f.eventId,
      result: f.result,
      gateId: f.gateId,
      userId: f.userId,
      scannedAt: f.from || f.to ? { gte: f.from, lte: f.to } : undefined,
    };
    const [total, rows] = await Promise.all([
      db.scanLog.count({ where }),
      db.scanLog.findMany({
        where,
        include: { gate: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { scannedAt: "desc" },
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
      }),
    ]);
    return { total, rows };
  },
};
