// Tes integrasi check-in ke database UJI (lihat vitest.int.config.mts).
import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/qr";
import { scan } from "./CheckInService";
import { checkGateAccess } from "./GateAccessService";
import type { UserRow } from "@/Models/User";

process.env.QR_ENC_KEY ??= randomBytes(32).toString("base64");

let officer: UserRow, outsider: UserRow, viewer: UserRow;
let gateA: { id: number; name: string; eventId: number }, gateB: typeof gateA, gateOff: typeof gateA;
const tokens: Record<string, string> = {};

async function guestWithQr(eventId: number, key: string, status: "ACTIVE" | "CANCELLED" = "ACTIVE") {
  const g = await db.guest.create({ data: { eventId, name: `Tamu ${key}`, groupName: "UJI", externalCode: key, status } });
  const t = issueToken();
  await db.qrCredential.create({ data: { guestId: g.id, tokenHash: t.tokenHash, tokenLast4: t.tokenLast4, tokenEncrypted: t.tokenEncrypted } });
  tokens[key] = t.token;
  return g;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes("_test")) throw new Error("Bukan database uji!");
  await db.$executeRawUnsafe(
    "TRUNCATE audit_logs, check_ins, scan_logs, qr_credentials, guests, import_batches, gate_assignments, gates, events, users, print_presets RESTART IDENTITY CASCADE",
  );
  const mk = (role: "GATE_OFFICER" | "VIEWER", n: string) =>
    db.user.create({ data: { name: n, email: `${n}@uji.local`, passwordHash: "x", role }, omit: { passwordHash: true } });
  [officer, outsider, viewer] = await Promise.all([mk("GATE_OFFICER", "petugas"), mk("GATE_OFFICER", "luar"), mk("VIEWER", "viewer")]);

  const ev = await db.event.create({ data: { name: "Event Uji", venueName: "Aula", eventDate: new Date(), status: "ACTIVE" } });
  const other = await db.event.create({ data: { name: "Event Lain", venueName: "Aula", eventDate: new Date(), status: "ACTIVE" } });
  const g = async (eventId: number, name: string, isActive = true) => {
    const r = await db.gate.create({ data: { eventId, name, isActive } });
    return { id: r.id, name: r.name, eventId };
  };
  [gateA, gateB, gateOff] = await Promise.all([g(ev.id, "Gate A"), g(ev.id, "Gate B"), g(ev.id, "Gate Off", false)]);
  await db.gateAssignment.createMany({ data: [gateA, gateB, gateOff].map((x) => ({ userId: officer.id, gateId: x.id })) });

  await guestWithQr(ev.id, "0001");
  await guestWithQr(ev.id, "0002");
  const revoked = await guestWithQr(ev.id, "0003");
  await db.qrCredential.updateMany({ where: { guestId: revoked.id }, data: { isActive: false, revokedAt: new Date() } });
  await guestWithQr(ev.id, "0004", "CANCELLED");
  await guestWithQr(other.id, "9001");
  await guestWithQr(ev.id, "0020");
});

describe("scan check-in", () => {
  it("TC-05: QR valid -> SUCCESS dengan nama, grup, gate, waktu", async () => {
    const r = await scan(tokens["0001"], gateA, officer.id);
    expect(r).toMatchObject({ ok: true, result: "SUCCESS", guest: { name: "Tamu 0001", group: "UJI", code: "0001" }, checkIn: { gate: "Gate A" } });
    expect(r.checkIn!.time).toMatch(/^\d{2}[.:]\d{2}[.:]\d{2}$/);
  });

  it("TC-07: QR sama discan lagi (gate lain) -> SUDAH CHECK-IN + data check-in pertama", async () => {
    const r = await scan(tokens["0001"], gateB, officer.id);
    expect(r).toMatchObject({ ok: false, result: "ALREADY_CHECKED_IN", previousCheckIn: { gate: "Gate A" } });
  });

  it("TC-06: QR tidak dikenal", async () => {
    expect((await scan("VP1_" + "z".repeat(43), gateA, officer.id)).result).toBe("UNKNOWN_QR");
    expect((await scan("bukan-qr-kita", gateA, officer.id)).result).toBe("UNKNOWN_QR");
  });

  it("TC-09: QR event lain -> WRONG_EVENT", async () => {
    expect((await scan(tokens["9001"], gateA, officer.id)).result).toBe("WRONG_EVENT");
  });

  it("TC-10: QR dicabut & tamu dibatalkan -> INACTIVE, tidak tercatat hadir", async () => {
    expect((await scan(tokens["0003"], gateA, officer.id)).result).toBe("INACTIVE");
    expect((await scan(tokens["0004"], gateA, officer.id)).result).toBe("INACTIVE");
    expect(await db.checkIn.count({ where: { guest: { externalCode: { in: ["0003", "0004"] } } } })).toBe(0);
  });

  it("spasi/Enter dari scanner USB di sekitar token diabaikan", async () => {
    expect((await scan(`  ${tokens["0002"]}\r\n`, gateA, officer.id)).result).toBe("SUCCESS");
  });

  it("TC-08: 20 scan paralel QR sama di 2 gate -> tepat 1 SUCCESS, 19 ALREADY_CHECKED_IN", async () => {
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => scan(tokens["0020"], i % 2 ? gateA : gateB, officer.id)));
    const counts = results.reduce<Record<string, number>>((m, r) => ({ ...m, [r.result]: (m[r.result] ?? 0) + 1 }), {});
    expect(counts).toEqual({ SUCCESS: 1, ALREADY_CHECKED_IN: 19 });
    expect(await db.checkIn.count({ where: { guest: { externalCode: "0020" } } })).toBe(1);
  });

  it("Mode Uji: check-in & scan_log ditandai is_test", async () => {
    await guestWithQr(gateA.eventId, "0030");
    const r = await scan(tokens["0030"], { ...gateA, testMode: true }, officer.id);
    expect(r.result).toBe("SUCCESS");
    const ci = await db.checkIn.findFirstOrThrow({ where: { guest: { externalCode: "0030" } } });
    expect(ci.isTest).toBe(true);
    expect(await db.scanLog.count({ where: { isTest: true } })).toBe(1);
    // bersihkan agar hitungan tes berikut tetap sama
    await db.checkIn.delete({ where: { id: ci.id } });
    await db.scanLog.deleteMany({ where: { isTest: true } });
  });

  it("scan_logs mencatat setiap scan tanpa token mentah", async () => {
    const logs = await db.scanLog.findMany();
    expect(logs.length).toBe(1 + 1 + 2 + 1 + 2 + 1 + 20);
    const dump = JSON.stringify(logs);
    for (const t of Object.values(tokens)) expect(dump).not.toContain(t.slice(4));
    expect(logs.every((l) => l.userId === officer.id && l.tokenFingerprint?.length === 16)).toBe(true);
  });
});

describe("akses gate (TC-14)", () => {
  it("petugas yang ditugaskan boleh; petugas lain & viewer ditolak", async () => {
    expect((await checkGateAccess(officer, gateA.id)).ok).toBe(true);
    expect(await checkGateAccess(outsider, gateA.id)).toMatchObject({ ok: false, status: 403 });
    expect(await checkGateAccess(viewer, gateA.id)).toMatchObject({ ok: false, status: 403 });
  });

  it("gate nonaktif & gate tidak ada ditolak", async () => {
    expect(await checkGateAccess(officer, gateOff.id)).toMatchObject({ ok: false, status: 409 });
    expect(await checkGateAccess(officer, 999999)).toMatchObject({ ok: false, status: 404 });
  });
});
