import "server-only";
import { db } from "@/lib/db";
import type { IssuedToken } from "@/lib/qr";
import type { DbClient } from "./types";

// Namespace advisory lock untuk penerbitan QR (lihat Guest.ts: 1001 = kode tamu).
const QR_LOCK = 1002;

export const QrCredential = {
  /** Kunci penerbitan QR per event: cegah dua QR aktif untuk satu tamu. */
  async lock(eventId: number, client: DbClient) {
    await client.$executeRaw`SELECT pg_advisory_xact_lock(${QR_LOCK}::int, ${eventId}::int)`;
  },

  active(guestId: number, client: DbClient = db) {
    return client.qrCredential.findFirst({ where: { guestId, isActive: true } });
  },

  create(guestId: number, t: IssuedToken, client: DbClient = db) {
    return client.qrCredential.create({
      data: { guestId, tokenHash: t.tokenHash, tokenLast4: t.tokenLast4, tokenEncrypted: t.tokenEncrypted },
      select: { id: true, guestId: true, tokenLast4: true, isActive: true, issuedAt: true },
    });
  },

  revokeActive(guestId: number, client: DbClient = db) {
    return client.qrCredential.updateMany({
      where: { guestId, isActive: true },
      data: { isActive: false, revokedAt: new Date() },
    });
  },

  /** Ringkasan untuk dashboard / halaman cetak (hanya tamu ACTIVE). */
  async summary(eventId: number) {
    const [activeGuests, withQr] = await Promise.all([
      db.guest.count({ where: { eventId, status: "ACTIVE" } }),
      db.guest.count({ where: { eventId, status: "ACTIVE", qrCredentials: { some: { isActive: true } } } }),
    ]);
    return { activeGuests, withQr, withoutQr: activeGuests - withQr };
  },
};
