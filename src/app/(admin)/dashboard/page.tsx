import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { formatDate } from "@/lib/time";
import { dashboardSummary } from "@/Services/DashboardService";
import { DashboardView } from "@/views/dashboard/DashboardView";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  if (user.role === "GATE_OFFICER") redirect("/scan");
  const { activeEvent, eventsByStatus, usersByRole, guestsByGroup, cancelledGuests, qr, attendance } = await dashboardSummary();
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
      attendance={attendance}
    />
  );
}
