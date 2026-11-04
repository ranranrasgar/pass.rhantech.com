import type { Metadata } from "next";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { formatDate } from "@/lib/time";
import { dashboardSummary } from "@/Services/DashboardService";
import { DashboardView } from "@/views/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requirePageUser();
  const { activeEvent, eventsByStatus, usersByRole, guestsByGroup, cancelledGuests, qr } = await dashboardSummary();
  return (
    <DashboardView
      activeEvent={
        activeEvent && {
          name: activeEvent.name,
          venueName: activeEvent.venueName,
          dateLabel: formatDate(activeEvent.eventDate),
          status: activeEvent.status,
        }
      }
      eventsByStatus={eventsByStatus}
      usersByRole={usersByRole}
      guestsByGroup={guestsByGroup}
      cancelledGuests={cancelledGuests}
      qr={qr}
    />
  );
}
