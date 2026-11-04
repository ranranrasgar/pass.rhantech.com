import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { Role } from "@/lib/roles";
import { formatDateTime } from "@/lib/time";
import { requireUser } from "@/Http/Middleware/Authenticate";
import { IssueQrRequest, RevokeQrRequest } from "@/Http/Requests/PrintRequest";
import { QrCredential } from "@/Models/QrCredential";
import { requireActiveEvent } from "@/Services/ActiveEventService";
import { generateMissing, issueForGuest, revokeForGuest } from "@/Services/QrService";
import { action, body, idParam, json } from "./Controller";

const MANAGERS = [Role.SUPER_ADMIN, Role.ADMIN];

export const QrController = {
  // GET /api/qr  — ringkasan QR event aktif
  summary: action(async () => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    return json({ data: await QrCredential.summary(event.id) });
  }),

  // POST /api/qr/generate  — QR untuk semua tamu aktif yang belum punya
  generate: action(async () => {
    const user = await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    return json({ data: await generateMissing(event.id, user.id) }, 201);
  }),

  // POST /api/guests/:id/issue-qr  { reason? }  — terbitkan / terbitkan ulang
  issue: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const { reason } = IssueQrRequest.parse(await body(req));
    return json({ data: await issueForGuest(id, user.id, reason) }, 201);
  }),

  // POST /api/guests/:id/revoke-qr  { reason }
  revoke: action(async (req, ctx) => {
    const user = await requireUser(MANAGERS);
    const id = await idParam(ctx);
    const { reason } = RevokeQrRequest.parse(await body(req));
    return json({ data: await revokeForGuest(id, user.id, reason) });
  }),

  // GET /api/qr/export  — daftar penerbitan QR (XLSX). Tidak memuat token mentah.
  export: action(async () => {
    await requireUser(MANAGERS);
    const event = await requireActiveEvent();
    const guests = await db.guest.findMany({
      where: { eventId: event.id },
      select: {
        externalCode: true,
        name: true,
        groupName: true,
        status: true,
        qrCredentials: { select: { isActive: true, issuedAt: true, revokedAt: true, tokenLast4: true }, orderBy: { issuedAt: "desc" }, take: 1 },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("QR");
    ws.columns = [
      { header: "Kode", key: "code", width: 8 },
      { header: "Nama", key: "name", width: 36 },
      { header: "Grup", key: "group", width: 30 },
      { header: "Status tamu", key: "status", width: 12 },
      { header: "Status QR", key: "qr", width: 12 },
      { header: "Diterbitkan", key: "issued", width: 22 },
      { header: "Dicabut", key: "revoked", width: 22 },
      { header: "4 digit akhir token", key: "last4", width: 18 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const g of guests) {
      const c = g.qrCredentials[0];
      ws.addRow({
        code: g.externalCode,
        name: g.name,
        group: g.groupName,
        status: g.status === "ACTIVE" ? "Aktif" : "Dibatalkan",
        qr: !c ? "Belum" : c.isActive ? "Aktif" : "Dicabut",
        issued: c ? formatDateTime(c.issuedAt) : "",
        revoked: c?.revokedAt ? formatDateTime(c.revokedAt) : "",
        last4: c?.tokenLast4 ?? "",
      });
    }
    const buf = await wb.xlsx.writeBuffer();
    const safe = event.name.replace(/[^\w.-]+/g, "_");
    return new Response(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="qr-${safe}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }),
};
