import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { GUESTS_PER_PAGE } from "@/Http/Controllers/GuestController";
import { GuestQuery } from "@/Http/Requests/GuestRequest";
import { Guest } from "@/Models/Guest";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { GuestIndex } from "@/views/guests/GuestIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "Data Tamu" };

export default async function GuestsPage({ searchParams }: PageProps<"/guests">) {
  await requirePageUser(rolesFor("/guests"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="Data Tamu" />;
  const query = GuestQuery.parse(await searchParams);
  const [{ total, rows }, groups] = await Promise.all([
    Guest.paginate({ eventId: event.id, ...query, perPage: GUESTS_PER_PAGE }),
    Guest.groups(event.id),
  ]);
  return (
    <GuestIndex
      eventName={event.name}
      guests={rows.map((g) => ({ id: g.id, externalCode: g.externalCode, name: g.name, groupName: g.groupName, status: g.status, notes: g.notes }))}
      groups={groups}
      filters={{ q: query.q, group: query.group, status: query.status }}
      page={query.page}
      perPage={GUESTS_PER_PAGE}
      total={total}
    />
  );
}
