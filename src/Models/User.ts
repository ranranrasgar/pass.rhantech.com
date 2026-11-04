import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/lib/roles";
import type { DbClient } from "./types";

// Kolom aman untuk dikirim ke view/API (tanpa password_hash).
const publicColumns = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserRow = Prisma.UserGetPayload<{ select: typeof publicColumns }>;

export const User = {
  all(): Promise<UserRow[]> {
    return db.user.findMany({ select: publicColumns, orderBy: { name: "asc" } });
  },

  find(id: number): Promise<UserRow | null> {
    return db.user.findUnique({ where: { id }, select: publicColumns });
  },

  /** Termasuk password_hash — hanya untuk proses login. */
  findForLogin(email: string) {
    return db.user.findUnique({ where: { email } });
  },

  create(data: { name: string; email: string; passwordHash: string; role: Role }, client: DbClient = db) {
    return client.user.create({ data, select: publicColumns });
  },

  update(id: number, data: Prisma.UserUpdateInput, client: DbClient = db) {
    return client.user.update({ where: { id }, data, select: publicColumns });
  },

  async countByRole(): Promise<Record<Role, number>> {
    const rows = await db.user.groupBy({ by: ["role"], where: { isActive: true }, _count: { _all: true } });
    const result = { SUPER_ADMIN: 0, ADMIN: 0, GATE_OFFICER: 0, VIEWER: 0 };
    for (const r of rows) result[r.role] = r._count._all;
    return result;
  },
};
