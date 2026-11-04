import type { Prisma } from "@/generated/prisma/client";
import type { db } from "@/lib/db";

/** Klien biasa atau klien transaksi (`db.$transaction(async (tx) => ...)`). */
export type DbClient = typeof db | Prisma.TransactionClient;
