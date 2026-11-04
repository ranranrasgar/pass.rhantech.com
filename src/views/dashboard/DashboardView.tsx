import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Card, CardContent, CardHeader, CardTitle } from "@/views/components/ui/card";
import { EVENT_STATUS_LABELS, EventStatusBadge } from "@/views/events/EventStatusBadge";
import type { EventStatus } from "@/generated/prisma/enums";

type Props = {
  activeEvent: { name: string; venueName: string; dateLabel: string; status: EventStatus } | null;
  eventsByStatus: Record<EventStatus, number>;
  usersByRole: Record<Role, number>;
};

export function DashboardView({ activeEvent, eventsByStatus, usersByRole }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>Event aktif</CardTitle>
        </CardHeader>
        <CardContent>
          {activeEvent ? (
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">{activeEvent.name}</span>
                <EventStatusBadge status={activeEvent.status} />
              </div>
              <div className="text-sm text-muted-foreground">
                {activeEvent.venueName} · {activeEvent.dateLabel}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada event. Buat event di menu Event.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Event per status" rows={Object.entries(eventsByStatus).map(([k, v]) => [EVENT_STATUS_LABELS[k as EventStatus], v])} />
        <StatCard title="Pengguna aktif per role" rows={Object.entries(usersByRole).map(([k, v]) => [ROLE_LABELS[k as Role], v])} />
      </div>
    </div>
  );
}

function StatCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
