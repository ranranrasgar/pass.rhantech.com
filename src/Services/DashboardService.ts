import "server-only";
import { Event } from "@/Models/Event";
import { Guest } from "@/Models/Guest";
import { User } from "@/Models/User";
import { getActiveEvent } from "./ActiveEventService";

export async function dashboardSummary() {
  const [activeEvent, eventsByStatus, usersByRole] = await Promise.all([
    getActiveEvent(),
    Event.countByStatus(),
    User.countByRole(),
  ]);
  const [guestsByGroup, cancelledGuests] = activeEvent
    ? await Promise.all([Guest.countByGroup(activeEvent.id), Guest.countCancelled(activeEvent.id)])
    : [[], 0];
  return { activeEvent, eventsByStatus, usersByRole, guestsByGroup, cancelledGuests };
}
