import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { db } from "@/lib/db";
import { formatDateTime, localDateToUtc } from "@/lib/time";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { AuditQuery } from "@/Http/Requests/ReportRequest";
import { AuditLog } from "@/Models/AuditLog";
import { TestModeTab } from "@/views/settings/TestModeTab";
import { testModeOverview } from "@/Services/TestModeService";
import { AuditLogIndex } from "@/views/settings/AuditLogIndex";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pengaturan" };
const PER_PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const show = (v: unknown) => (v == null ? null : JSON.stringify(v, null, 2));

const TABS = [
  ["mode", "Mode Uji / Live"],
  ["audit", "Audit Log"],
] as const;

// Pengaturan (Super Admin): tab Mode Uji per event + Audit Log.
export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await requirePageUser(rolesFor("/settings"));
  const params = await searchParams;
  const tab = params.tab === "audit" ? "audit" : "mode";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pengaturan</h1>
      <nav className="flex flex-wrap gap-1 border-b">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "mode" ? "/settings" : `/settings?tab=${key}`}
            className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "audit" ? <AuditTab params={params} /> : <TestModeTab events={await testModeOverview()} />}
    </div>
  );
}

async function AuditTab({ params }: { params: Record<string, string | string[] | undefined> }) {
  const q = AuditQuery.parse(params);
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
