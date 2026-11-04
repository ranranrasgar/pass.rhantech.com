import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { db } from "@/lib/db";
import { hasRole } from "@/lib/roles";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { CORRECT_ROLES, REPORT_PER_PAGE } from "@/Http/Controllers/ReportController";
import { ReportQuery } from "@/Http/Requests/ReportRequest";
import { Guest } from "@/Models/Guest";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { attendance, gateRecap, rejectedScans, reportSummary } from "@/Services/ReportService";
import { ReportIndex } from "@/views/reports/ReportIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "Laporan Kehadiran" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const user = await requirePageUser(rolesFor("/reports"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="Laporan Kehadiran" />;
  const f = ReportQuery.parse(await searchParams);
  const [summary, groups, gates] = await Promise.all([
    reportSummary(event.id),
    Guest.groups(event.id),
    db.gate.findMany({ where: { eventId: event.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  let data;
  let total;
  if (f.tab === "gates") {
    const d = await gateRecap(event.id, f);
    data = { kind: "gates" as const, rows: d.rows };
    total = d.rows.length;
  } else if (f.tab === "rejected") {
    const d = await rejectedScans(event.id, f, REPORT_PER_PAGE);
    data = { kind: "rejected" as const, rows: d.rows };
    total = d.total;
  } else {
    const d = await attendance(event.id, f, REPORT_PER_PAGE);
    data = { kind: "attendance" as const, rows: d.rows };
    total = d.total;
  }
  return (
    <ReportIndex
      eventName={event.name}
      summary={summary}
      filters={{ tab: f.tab, group: f.group, gate: f.gate, status: f.status, from: f.from, to: f.to }}
      groups={groups}
      gates={gates}
      page={f.page}
      perPage={REPORT_PER_PAGE}
      total={total}
      canCorrect={hasRole(user.role, CORRECT_ROLES)}
      data={data}
    />
  );
}
