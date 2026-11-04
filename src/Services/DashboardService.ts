import "server-only";
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
  const [guestsByGroup, cancelledGuests, qr] = activeEvent
    ? await Promise.all([Guest.countByGroup(activeEvent.id), Guest.countCancelled(activeEvent.id), QrCredential.summary(activeEvent.id)])
    : [[], 0, null];
  return { activeEvent, eventsByStatus, usersByRole, guestsByGroup, cancelledGuests, qr };
}
