import type { Metadata } from "next";
import { Role } from "@/lib/roles";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { SCAN_ROLES, usableGates } from "@/Services/GateAccessService";
import { GatePicker } from "@/views/scan/GatePicker";
import { ScanStationClient } from "@/views/scan/ScanStationClient";

export const metadata: Metadata = { title: "Scan Gate" };

export default async function ScanPage({ searchParams }: PageProps<"/scan">) {
  const user = await requirePageUser(SCAN_ROLES);
  const gates = (await usableGates(user)).map((g) => ({ id: g.id, name: g.name, eventName: g.event.name, testMode: g.event.testMode }));
  const canLeave = user.role !== Role.GATE_OFFICER;
  const gateId = Number((await searchParams).gate);
  const gate = gates.find((g) => g.id === gateId);
  // Gate tunggal langsung dibuka; gate di URL yang tidak berhak -> kembali ke pilihan.
  const chosen = gate ?? (gates.length === 1 && !gateId ? gates[0] : undefined);
  if (!chosen) return <GatePicker gates={gates} officerName={user.name} canLeave={canLeave} />;
  return <ScanStationClient key={chosen.id} gate={chosen} officerName={user.name} canLeave={canLeave} />;
}
