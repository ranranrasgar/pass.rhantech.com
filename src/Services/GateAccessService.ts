import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import type { UserRow } from "@/Models/User";

// Petugas Gate: hanya gate yang ditugaskan. Super Admin / Admin: semua gate (untuk uji).
const ANY_GATE: Role[] = [Role.SUPER_ADMIN, Role.ADMIN];
export const SCAN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.GATE_OFFICER];

/** Gate aktif pada event ACTIVE yang boleh dipakai user untuk scan. */
export function usableGates(user: UserRow) {
  return db.gate.findMany({
    where: {
      isActive: true,
      event: { status: "ACTIVE" },
      assignments: ANY_GATE.includes(user.role) ? undefined : { some: { userId: user.id } },
    },
    include: { event: { select: { id: true, name: true } } },
    orderBy: [{ event: { name: "asc" } }, { name: "asc" }],
  });
}

export type GateAccess =
  | { ok: true; gate: { id: number; name: string; eventId: number; eventName: string } }
  | { ok: false; status: 403 | 404 | 409; message: string };

/** Cek user boleh scan di gate ini & gate/event sedang aktif. */
export async function checkGateAccess(user: UserRow, gateId: number): Promise<GateAccess> {
  if (!SCAN_ROLES.includes(user.role)) return { ok: false, status: 403, message: "Role Anda tidak bisa melakukan scan" };
  const gate = await db.gate.findUnique({
    where: { id: gateId },
    include: { event: { select: { name: true, status: true } }, assignments: { where: { userId: user.id }, select: { id: true } } },
  });
  if (!gate) return { ok: false, status: 404, message: "Gate tidak ditemukan" };
  if (!ANY_GATE.includes(user.role) && gate.assignments.length === 0) {
    return { ok: false, status: 403, message: "Anda tidak ditugaskan di gate ini" };
  }
  if (!gate.isActive) return { ok: false, status: 409, message: "Gate sedang nonaktif" };
  if (gate.event.status !== "ACTIVE") return { ok: false, status: 409, message: "Event belum/tidak aktif" };
  return { ok: true, gate: { id: gate.id, name: gate.name, eventId: gate.eventId, eventName: gate.event.name } };
}
