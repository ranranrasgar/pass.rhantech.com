import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { formatDate, utcToLocalDate } from "@/lib/time";
import { Event } from "@/Models/Event";
import { EventIndex } from "@/views/events/EventIndex";

export const metadata: Metadata = { title: "Event" };

export default async function EventsPage() {
  await requirePageUser(rolesFor("/events"));
  const events = await Event.all();
  return (
    <EventIndex
      events={events.map((e) => ({
        id: e.id,
        name: e.name,
        venueName: e.venueName,
        eventDate: utcToLocalDate(e.eventDate),
        dateLabel: formatDate(e.eventDate),
        status: e.status,
      }))}
    />
  );
}
