import "server-only";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { HttpError, requireUser } from "@/Http/Middleware/Authenticate";
import { CancelCheckInRequest, ExportQuery, ReportQuery } from "@/Http/Requests/ReportRequest";
import { AuditLog } from "@/Models/AuditLog";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { attendance, gateRecap, rejectedScans, reportSummary, type AttendanceRow } from "@/Services/ReportService";
import { toCsv, toXlsx, type Column } from "@/Services/Report/exportFile";
import { action, body, idParam, json } from "./Controller";

// Laporan & ekspor: Super Admin, Admin, Viewer (FR-07). Koreksi: hanya Super Admin & Admin.
export const REPORT_ROLES = [Role.SUPER_ADMIN, Role.ADMIN, Role.VIEWER];
export const CORRECT_ROLES = [Role.SUPER_ADMIN, Role.ADMIN];
export const REPORT_PER_PAGE = 50;

const ATTENDANCE_COLUMNS: Column<AttendanceRow>[] = [
  { header: "No.", width: 6, value: (r) => r.no },
  { header: "Nama", width: 36, value: (r) => r.name },
  { header: "Grup", width: 30, value: (r) => r.group },
  { header: "Kode tamu", width: 11, value: (r) => r.code },
  { header: "Status kehadiran", width: 16, value: (r) => (r.present ? "Hadir" : "Belum hadir") },
  { header: "Waktu hadir", width: 22, value: (r) => r.time },
  { header: "Gate", width: 14, value: (r) => r.gate },
  { header: "Petugas", width: 24, value: (r) => r.officer },
  { header: "Metode", width: 10, value: (r) => (r.method === "MANUAL" ? "Manual" : r.method === "QR" ? "QR" : null) },
  { header: "Alasan manual", width: 30, value: (r) => r.manualReason },
];

type Rejected = Awaited<ReturnType<typeof rejectedScans>>["rows"][number];
const REJECTED_COLUMNS: Column<Rejected>[] = [
  { header: "No.", width: 6, value: (r) => r.no },
  { header: "Waktu", width: 22, value: (r) => r.time },
  { header: "Hasil", width: 20, value: (r) => r.result },
  { header: "Keterangan", width: 44, value: (r) => r.message },
  { header: "Gate", width: 14, value: (r) => r.gate },
  { header: "Petugas", width: 24, value: (r) => r.officer },
];

type GateRow = Awaited<ReturnType<typeof gateRecap>>["rows"][number];
const GATE_COLUMNS: Column<GateRow>[] = [
  { header: "Gate", width: 20, value: (r) => r.gate },
  { header: "Status gate", width: 12, value: (r) => (r.active ? "Aktif" : "Nonaktif") },
  { header: "Jumlah check-in", width: 16, value: (r) => r.count },
];

const TAB_NAME = { all: "kehadiran", absent: "belum-hadir", gates: "per-gate", rejected: "scan-ditolak" } as const;

export const ReportController = {
  // GET /api/reports/attendance?tab=&group=&gate=&status=&from=&to=&page=
  attendance: action(async (req) => {
    await requireUser(REPORT_ROLES);
    const event = await requireActiveEvent();
    const f = ReportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
    const [summary, data] = await Promise.all([
      reportSummary(event.id),
      f.tab === "gates" ? gateRecap(event.id, f) : f.tab === "rejected" ? rejectedScans(event.id, f, REPORT_PER_PAGE) : attendance(event.id, f, REPORT_PER_PAGE),
    ]);
    return json({ data: data.rows, meta: { total: data.total, page: f.page, perPage: REPORT_PER_PAGE, summary } });
  }),

  // GET /api/reports/export?format=xlsx|csv + filter yang sama dengan halaman
  export: action(async (req) => {
    const user = await requireUser(REPORT_ROLES);
    const event = await requireActiveEvent();
    const f = ExportQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
    let file: Buffer;
    let count: number;
    const title = `Laporan ${TAB_NAME[f.tab].replace("-", " ")} — ${event.name}`;
    if (f.tab === "gates") {
      const d = await gateRecap(event.id, f);
      count = d.rows.length;
      file = f.format === "csv" ? toCsv(GATE_COLUMNS, d.rows) : await toXlsx("Per gate", GATE_COLUMNS, d.rows, title);
    } else if (f.tab === "rejected") {
      const d = await rejectedScans(event.id, f, null);
      count = d.total;
      file = f.format === "csv" ? toCsv(REJECTED_COLUMNS, d.rows) : await toXlsx("Scan ditolak", REJECTED_COLUMNS, d.rows, title);
    } else {
      const d = await attendance(event.id, f, null);
      count = d.total;
      file = f.format === "csv" ? toCsv(ATTENDANCE_COLUMNS, d.rows) : await toXlsx("Kehadiran", ATTENDANCE_COLUMNS, d.rows, title);
    }
    await AuditLog.record({ userId: user.id, action: "report.export", entityType: "event", entityId: event.id, after: { ...f, rows: count } });
    const safe = event.name.replace(/[^\w.-]+/g, "_");
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": f.format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${TAB_NAME[f.tab]}-${safe}.${f.format}"`,
        "Cache-Control": "no-store",
        "X-Row-Count": String(count),
      },
    });
  }),

  // POST /api/check-ins/:id/cancel  { reason }  — koreksi: data lama ke audit, baris dihapus.
  cancelCheckIn: action(async (req, ctx) => {
    const user = await requireUser(CORRECT_ROLES);
    const id = await idParam(ctx);
    const { reason } = CancelCheckInRequest.parse(await body(req));
    await db.$transaction(async (tx) => {
      const ci = await tx.checkIn.findUnique({
        where: { id },
        include: { guest: { select: { name: true, externalCode: true } }, gate: { select: { name: true } }, user: { select: { name: true } } },
      });
      if (!ci) throw new HttpError(404, "Check-in tidak ditemukan (mungkin sudah dibatalkan)");
      await AuditLog.record(
        {
          userId: user.id,
          action: "checkin.cancel",
          entityType: "check_in",
          entityId: id,
          before: { ...ci, gateName: ci.gate.name, officerName: ci.user.name },
          after: null,
          reason,
        },
        tx,
      );
      await tx.checkIn.delete({ where: { id } });
    });
    return json({ data: { ok: true } });
  }),
};
