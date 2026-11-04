import "server-only";
// Laporan kehadiran (PRD §11.6, FR-07). Angka konsisten dengan dashboard:
// hanya tamu ACTIVE yang dihitung "terdaftar"; hadir = punya baris check_ins.
import { db } from "@/lib/db";
import { formatDateTime, localDateToUtc } from "@/lib/time";
import type { Prisma } from "@/generated/prisma/client";
import type { ReportFilter } from "@/Http/Requests/ReportRequest";

const DAY_MS = 24 * 60 * 60 * 1000;

function range(f: Pick<ReportFilter, "from" | "to">) {
  if (!f.from && !f.to) return undefined;
  return {
    gte: f.from ? localDateToUtc(f.from) : undefined,
    lte: f.to ? new Date(localDateToUtc(f.to).getTime() + DAY_MS - 1) : undefined,
  };
}

/**
 * Tab "absent" = belum hadir. Filter gate/waktu berlaku pada check-in, jadi bila
 * diisi (tanpa status) yang tampil hanya tamu hadir yang cocok.
 */
function guestWhere(eventId: number, f: ReportFilter): Prisma.GuestWhereInput {
  const absent = f.tab === "absent" || f.status === "absent";
  const ci: Prisma.CheckInWhereInput = { gateId: f.gate, checkedInAt: range(f) };
  const ciFiltered = f.gate !== undefined || !!f.from || !!f.to;
  return {
    eventId,
    status: "ACTIVE",
    groupName: f.group || undefined,
    checkIns: absent ? { none: {} } : f.status === "present" || ciFiltered ? { some: ci } : undefined,
  };
}

const rowSelect = {
  id: true,
  externalCode: true,
  name: true,
  groupName: true,
  checkIns: { select: { id: true, checkedInAt: true, gate: { select: { name: true } }, user: { select: { name: true } } }, take: 1 },
} satisfies Prisma.GuestSelect;

export type AttendanceRow = {
  no: number;
  guestId: number;
  checkInId: number | null;
  code: string | null;
  name: string;
  group: string;
  present: boolean;
  time: string | null;
  gate: string | null;
  officer: string | null;
};

function toRow(g: Prisma.GuestGetPayload<{ select: typeof rowSelect }>, no: number): AttendanceRow {
  const c = g.checkIns[0];
  return {
    no,
    guestId: g.id,
    checkInId: c?.id ?? null,
    code: g.externalCode,
    name: g.name,
    group: g.groupName,
    present: !!c,
    time: c ? formatDateTime(c.checkedInAt) : null,
    gate: c?.gate.name ?? null,
    officer: c?.user.name ?? null,
  };
}

/** Baris laporan kehadiran; `perPage` null = semua (untuk ekspor). */
export async function attendance(eventId: number, f: ReportFilter, perPage: number | null) {
  const where = guestWhere(eventId, f);
  const skip = perPage ? (f.page - 1) * perPage : 0;
  const [total, guests] = await Promise.all([
    db.guest.count({ where }),
    db.guest.findMany({
      where,
      select: rowSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip,
      take: perPage ?? undefined,
    }),
  ]);
  return { total, rows: guests.map((g, i) => toRow(g, skip + i + 1)) };
}

/** Rekap per gate (+ grup) untuk tab "Per Gate". */
export async function gateRecap(eventId: number, f: ReportFilter) {
  const where: Prisma.CheckInWhereInput = { eventId, guest: { status: "ACTIVE", groupName: f.group || undefined }, checkedInAt: range(f) };
  const [gates, grouped] = await Promise.all([
    db.gate.findMany({ where: { eventId }, select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }),
    db.checkIn.groupBy({ by: ["gateId"], where, _count: { _all: true } }),
  ]);
  const count = new Map(grouped.map((g) => [g.gateId, g._count._all]));
  const rows = gates.map((g) => ({ gate: g.name, active: g.isActive, count: count.get(g.id) ?? 0 }));
  return { rows, total: rows.reduce((s, r) => s + r.count, 0) };
}

/** Scan ditolak / duplikat (semua hasil selain SUCCESS) untuk audit. */
export async function rejectedScans(eventId: number, f: ReportFilter, perPage: number | null) {
  const where: Prisma.ScanLogWhereInput = { eventId, result: { not: "SUCCESS" }, gateId: f.gate, scannedAt: range(f) };
  const skip = perPage ? (f.page - 1) * perPage : 0;
  const [total, logs] = await Promise.all([
    db.scanLog.count({ where }),
    db.scanLog.findMany({
      where,
      include: { gate: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { scannedAt: "desc" },
      skip,
      take: perPage ?? undefined,
    }),
  ]);
  return {
    total,
    rows: logs.map((l, i) => ({
      no: skip + i + 1,
      id: l.id,
      time: formatDateTime(l.scannedAt),
      result: l.result,
      message: l.message,
      gate: l.gate?.name ?? null,
      officer: l.user?.name ?? null,
    })),
  };
}

/** Ringkasan event (sama dengan dashboard) untuk kartu di atas laporan. */
export async function reportSummary(eventId: number) {
  const [registered, present] = await Promise.all([
    db.guest.count({ where: { eventId, status: "ACTIVE" } }),
    db.checkIn.count({ where: { eventId, guest: { status: "ACTIVE" } } }),
  ]);
  return { registered, present, absent: registered - present, percent: registered ? Math.round((present / registered) * 1000) / 10 : 0 };
}
