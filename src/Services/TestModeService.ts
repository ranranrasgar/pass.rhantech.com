import "server-only";
// Mode Uji per event. Selama aktif, setiap check-in & scan_log ditandai is_test.
// Mengakhiri mode uji SELALU menghapus data uji: check-in uji yang tertinggal akan
// membuat tamu asli ditolak "SUDAH CHECK-IN" (unique guest_id + event_id).
import { db } from "@/lib/db";
import { AuditLog } from "@/Models/AuditLog";
import type { DbClient } from "@/Models/types";

async function deleteTestData(eventId: number, client: DbClient) {
  const checkIns = await client.checkIn.deleteMany({ where: { eventId, isTest: true } });
  const scanLogs = await client.scanLog.deleteMany({ where: { eventId, isTest: true } });
  return { checkIns: checkIns.count, scanLogs: scanLogs.count };
}

export async function setTestMode(eventId: number, enabled: boolean, userId: number) {
  return db.$transaction(async (tx) => {
    const event = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
    const removed = enabled ? { checkIns: 0, scanLogs: 0 } : await deleteTestData(eventId, tx);
    await tx.event.update({ where: { id: eventId }, data: { testMode: enabled } });
    await AuditLog.record(
      {
        userId,
        action: enabled ? "event.test_mode_on" : "event.test_mode_off",
        entityType: "event",
        entityId: eventId,
        before: { testMode: event.testMode },
        after: { testMode: enabled, removed },
      },
      tx,
    );
    return { testMode: enabled, removed };
  });
}

export async function clearTestData(eventId: number, userId: number) {
  return db.$transaction(async (tx) => {
    await tx.event.findUniqueOrThrow({ where: { id: eventId } });
    const removed = await deleteTestData(eventId, tx);
    await AuditLog.record({ userId, action: "event.clear_test_data", entityType: "event", entityId: eventId, after: { removed } }, tx);
    return { removed };
  });
}

/** Ringkasan semua event untuk tab Mode Uji. */
export async function testModeOverview() {
  const [events, ci, logs] = await Promise.all([
    db.event.findMany({ select: { id: true, name: true, status: true, testMode: true }, orderBy: [{ eventDate: "desc" }, { id: "desc" }] }),
    db.checkIn.groupBy({ by: ["eventId"], where: { isTest: true }, _count: { _all: true } }),
    db.scanLog.groupBy({ by: ["eventId"], where: { isTest: true }, _count: { _all: true } }),
  ]);
  const ciMap = new Map(ci.map((r) => [r.eventId, r._count._all]));
  const logMap = new Map(logs.map((r) => [r.eventId, r._count._all]));
  return events.map((e) => ({ ...e, testCheckIns: ciMap.get(e.id) ?? 0, testScanLogs: logMap.get(e.id) ?? 0 }));
}
