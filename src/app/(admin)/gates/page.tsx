import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { db } from "@/lib/db";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { Gate } from "@/Models/Gate";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { GateIndex } from "@/views/gates/GateIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "Gate & Petugas" };

export default async function GatesPage() {
  await requirePageUser(rolesFor("/gates"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="Gate & Petugas" />;
  const [gates, officers] = await Promise.all([
    Gate.forEvent(event.id),
    db.user.findMany({ where: { role: "GATE_OFFICER", isActive: true }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <GateIndex
      eventName={event.name}
      officers={officers}
      gates={gates.map((g) => ({ id: g.id, name: g.name, isActive: g.isActive, officers: g.assignments.map((a) => a.user) }))}
    />
  );
}
