import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "./types";

type Entry = {
  userId: number;
  action: string; // mis. "user.create", "event.update"
  entityType: string;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
};

// Prisma butuh JSON murni (Date -> string ISO).
const toJson = (v: unknown) =>
  v === undefined || v === null ? undefined : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);

export type AuditFilter = { userId?: number; action?: string; from?: Date; to?: Date; page: number; perPage: number };

export const AuditLog = {
  async paginate(f: AuditFilter) {
    const where: Prisma.AuditLogWhereInput = {
      userId: f.userId,
      action: f.action || undefined,
      createdAt: f.from || f.to ? { gte: f.from, lte: f.to } : undefined,
    };
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (f.page - 1) * f.perPage,
        take: f.perPage,
      }),
    ]);
    return { total, rows };
  },

  async actions(): Promise<string[]> {
    const rows = await db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } });
    return rows.map((r) => r.action);
  },

  record(entry: Entry, client: DbClient = db) {
    return client.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId == null ? null : String(entry.entityId),
        beforeData: toJson(entry.before),
        afterData: toJson(entry.after),
        reason: entry.reason ?? null,
      },
    });
  },
};
