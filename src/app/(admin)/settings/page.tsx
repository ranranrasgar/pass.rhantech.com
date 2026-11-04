import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { db } from "@/lib/db";
import { formatDateTime, localDateToUtc } from "@/lib/time";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { AuditQuery } from "@/Http/Requests/ReportRequest";
import { AuditLog } from "@/Models/AuditLog";
import { AuditLogIndex } from "@/views/settings/AuditLogIndex";

export const metadata: Metadata = { title: "Pengaturan" };
const PER_PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const show = (v: unknown) => (v == null ? null : JSON.stringify(v, null, 2));

// Keputusan pengguna (F5): menu Pengaturan hanya berisi Audit Log.
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await requirePageUser(rolesFor("/settings"));
  const q = AuditQuery.parse(await searchParams);
  const [{ total, rows }, users, actions] = await Promise.all([
    AuditLog.paginate({
      userId: q.user,
      action: q.action,
      from: q.from ? localDateToUtc(q.from) : undefined,
      to: q.to ? new Date(localDateToUtc(q.to).getTime() + DAY_MS - 1) : undefined,
      page: q.page,
      perPage: PER_PAGE,
    }),
    db.user.findMany({ where: { auditLogs: { some: {} } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    AuditLog.actions(),
  ]);
  return (
    <AuditLogIndex
      rows={rows.map((r) => ({
        id: r.id,
        time: formatDateTime(r.createdAt),
        user: r.user.name,
        action: r.action,
        entity: r.entityId ? `${r.entityType} #${r.entityId}` : r.entityType,
        reason: r.reason,
        before: show(r.beforeData),
        after: show(r.afterData),
      }))}
      total={total}
      page={q.page}
      perPage={PER_PAGE}
      filters={{ user: q.user, action: q.action, from: q.from, to: q.to }}
      users={users}
      actions={actions}
    />
  );
}
