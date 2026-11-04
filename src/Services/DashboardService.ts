import "server-only";
import { formatDateTime } from "@/lib/time";
import { CheckIn } from "@/Models/CheckIn";
import { Event } from "@/Models/Event";
import { Guest } from "@/Models/Guest";
import { QrCredential } from "@/Models/QrCredential";
import { User } from "@/Models/User";
import { getActiveEvent } from "./ActiveEventService";

export async function dashboardSummary() {
  const [activeEvent, eventsByStatus, usersByRole] = await Promise.all([
    getActiveEvent(),
    Event.countByStatus(),
    User.countByRole(),
  ]);
  const [guestsByGroup, cancelledGuests, qr, attendance] = activeEvent
    ? await Promise.all([
        Guest.countByGroup(activeEvent.id),
        Guest.countCancelled(activeEvent.id),
        QrCredential.summary(activeEvent.id),
        attendanceFor(activeEvent.id),
      ])
    : [[], 0, null, null];
  return { activeEvent, eventsByStatus, usersByRole, guestsByGroup, cancelledGuests, qr, attendance };
}

async function attendanceFor(eventId: number) {
  const [summary, latest] = await Promise.all([CheckIn.summary(eventId), CheckIn.latest(eventId, 10)]);
  return {
    ...summary,
    latest: latest.map((c) => ({
      time: formatDateTime(c.checkedInAt),
      name: c.guest.name,
      group: c.guest.groupName,
      code: c.guest.externalCode,
      gate: c.gate.name,
      officer: c.user.name,
    })),
    updatedAt: formatDateTime(new Date()),
  };
}
