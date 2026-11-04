import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { Event } from "@/Models/Event";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { AdminLayout } from "@/views/layouts/AdminLayout";

export default async function Layout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  const [events, active] = await Promise.all([Event.all(), getActiveEvent()]);
  return (
    <AdminLayout user={user} events={events.map((e) => ({ id: e.id, name: e.name }))} activeEventId={active?.id ?? null}>
      {children}
    </AdminLayout>
  );
}
