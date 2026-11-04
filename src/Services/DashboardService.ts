import "server-only";
import { Event } from "@/Models/Event";
import { User } from "@/Models/User";
import { getActiveEvent } from "./ActiveEventService";

export async function dashboardSummary() {
  const [activeEvent, eventsByStatus, usersByRole] = await Promise.all([
    getActiveEvent(),
    Event.countByStatus(),
    User.countByRole(),
  ]);
  return { activeEvent, eventsByStatus, usersByRole };
}
