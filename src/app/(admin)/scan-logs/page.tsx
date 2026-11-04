import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { db } from "@/lib/db";
import { formatDateTime, localDateToUtc } from "@/lib/time";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { ScanLogQuery } from "@/Http/Requests/ScanRequest";
import { ScanLog } from "@/Models/ScanLog";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { ScanLogIndex } from "@/views/scan-logs/ScanLogIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "Riwayat Scan" };
const PER_PAGE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function ScanLogsPage({ searchParams }: PageProps<"/scan-logs">) {
  await requirePageUser(rolesFor("/scan-logs"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="Riwayat Scan" />;
  const q = ScanLogQuery.parse(await searchParams);
  const [{ total, rows }, gates, users] = await Promise.all([
    ScanLog.paginate({
      eventId: event.id,
      result: q.result,
      gateId: q.gate,
      userId: q.user,
      // Tanggal lokal APP_TIMEZONE; "sampai" mencakup seluruh hari itu.
      from: q.from ? localDateToUtc(q.from) : undefined,
      to: q.to ? new Date(localDateToUtc(q.to).getTime() + DAY_MS - 1) : undefined,
      page: q.page,
      perPage: PER_PAGE,
    }),
    db.gate.findMany({ where: { eventId: event.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { scanLogs: { some: { eventId: event.id } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <ScanLogIndex
      eventName={event.name}
      rows={rows.map((r) => ({ id: r.id, time: formatDateTime(r.scannedAt), result: r.result, message: r.message, gate: r.gate?.name ?? null, user: r.user?.name ?? null }))}
      total={total}
      page={q.page}
      perPage={PER_PAGE}
      filters={{ result: q.result, gate: q.gate, user: q.user, from: q.from, to: q.to }}
      gates={gates}
      users={users}
    />
  );
}
