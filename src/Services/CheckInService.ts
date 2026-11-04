import "server-only";
// Logika check-in atomik (PRD §12.4 + keputusan §1.3 #3).
// - Unique (guest_id, event_id) di DB adalah pelindung utama scan bersamaan.
// - scan_log ditulis SETELAH hasil diketahui, di luar insert check-in.
// - Token mentah tidak pernah disimpan, dicatat, atau dikembalikan.
import { db } from "@/lib/db";
import { hashToken } from "@/lib/qr";
import { APP_TIMEZONE } from "@/lib/time";
import { Prisma, type ScanResult } from "@/generated/prisma/client";
import { ScanLog } from "@/Models/ScanLog";

export type ScanGate = { id: number; name: string; eventId: number };

export type ScanResponse = {
  ok: boolean;
  result: ScanResult;
  message: string;
  guest?: { name: string; group: string; code: string | null };
  checkIn?: { gate: string; checkedInAt: string; time: string };
  previousCheckIn?: { gate: string; checkedInAt: string; time: string };
};

const timeLabel = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(d);
const stamp = (gate: string, d: Date) => ({ gate, checkedInAt: d.toISOString(), time: timeLabel(d) });

export async function scan(rawToken: string, gate: ScanGate, userId: number): Promise<ScanResponse> {
  const token = rawToken.trim();
  const tokenHash = hashToken(token);
  const log = (result: ScanResult, message: string) =>
    ScanLog.record({ eventId: gate.eventId, gateId: gate.id, userId, tokenFingerprint: tokenHash.slice(0, 16), result, message });

  try {
    const cred = await db.qrCredential.findUnique({
      where: { tokenHash },
      select: { isActive: true, guest: { select: { id: true, eventId: true, name: true, groupName: true, externalCode: true, status: true } } },
    });
    if (!cred) {
      await log("UNKNOWN_QR", "QR tidak dikenal");
      return { ok: false, result: "UNKNOWN_QR", message: "QR TIDAK DIKENAL" };
    }
    const g = cred.guest;
    const guest = { name: g.name, group: g.groupName, code: g.externalCode };
    if (g.eventId !== gate.eventId) {
      await log("WRONG_EVENT", `QR milik event lain (tamu ${g.id})`);
      return { ok: false, result: "WRONG_EVENT", message: "EVENT TIDAK SESUAI" };
    }
    if (!cred.isActive || g.status !== "ACTIVE") {
      const why = !cred.isActive ? "QR sudah dicabut / diganti" : "Tiket tamu dibatalkan";
      await log("INACTIVE", `${why} (tamu ${g.id})`);
      return { ok: false, result: "INACTIVE", message: `TIKET TIDAK AKTIF — ${why}`, guest };
    }

    try {
      const created = await db.checkIn.create({
        data: { guestId: g.id, eventId: gate.eventId, gateId: gate.id, userId },
        select: { checkedInAt: true },
      });
      await log("SUCCESS", `Check-in tamu ${g.id}`);
      return { ok: true, result: "SUCCESS", message: "BERHASIL", guest, checkIn: stamp(gate.name, created.checkedInAt) };
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      const prev = await db.checkIn.findUnique({
        where: { guestId_eventId: { guestId: g.id, eventId: gate.eventId } },
        select: { checkedInAt: true, gate: { select: { name: true } } },
      });
      await log("ALREADY_CHECKED_IN", `Tamu ${g.id} sudah check-in`);
      return {
        ok: false,
        result: "ALREADY_CHECKED_IN",
        message: "SUDAH CHECK-IN",
        guest,
        previousCheckIn: prev ? stamp(prev.gate.name, prev.checkedInAt) : undefined,
      };
    }
  } catch (err) {
    console.error("scan error", err instanceof Error ? err.message : err); // tanpa token
    await log("ERROR", "Kesalahan server saat validasi").catch(() => {});
    return { ok: false, result: "ERROR", message: "GAGAL MEMVALIDASI — coba lagi" };
  }
}
