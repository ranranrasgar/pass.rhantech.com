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

export const AuditLog = {
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
