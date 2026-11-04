import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { DbClient } from "./types";

export const ImportBatch = {
  forEvent(eventId: number) {
    return db.importBatch.findMany({
      where: { eventId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  create(data: Prisma.ImportBatchUncheckedCreateInput, client: DbClient = db) {
    return client.importBatch.create({ data });
  },

  update(id: number, data: Prisma.ImportBatchUpdateInput, client: DbClient = db) {
    return client.importBatch.update({ where: { id }, data });
  },
};
