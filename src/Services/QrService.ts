import "server-only";
import { db } from "@/lib/db";
import { issueToken } from "@/lib/qr";
import { HttpError } from "@/Http/Middleware/Authenticate";
import { AuditLog } from "@/Models/AuditLog";
import { QrCredential } from "@/Models/QrCredential";
import type { DbClient } from "@/Models/types";

/** Buat QR untuk semua tamu ACTIVE di event yang belum punya QR aktif. */
export async function generateMissing(eventId: number, userId: number) {
  return db.$transaction(
    async (tx) => {
      await QrCredential.lock(eventId, tx);
      const guests = await tx.guest.findMany({
        where: { eventId, status: "ACTIVE", qrCredentials: { none: { isActive: true } } },
        select: { id: true },
      });
      if (guests.length) {
        await tx.qrCredential.createMany({
          data: guests.map((g) => {
            const t = issueToken();
            return { guestId: g.id, tokenHash: t.tokenHash, tokenLast4: t.tokenLast4, tokenEncrypted: t.tokenEncrypted };
          }),
        });
      }
      await AuditLog.record(
        { userId, action: "qr.generate_bulk", entityType: "event", entityId: eventId, after: { created: guests.length } },
        tx,
      );
      return { created: guests.length };
    },
    { timeout: 60_000 },
  );
}

/**
 * Terbitkan ulang QR SEMUA tamu ACTIVE di event (mis. ganti ke format token baru / PDF bocor).
 * Semua QR aktif lama dicabut -> gelang lama tidak berlaku lagi.
 */
export async function reissueAll(eventId: number, userId: number, reason: string) {
  return db.$transaction(
    async (tx) => {
      await QrCredential.lock(eventId, tx);
      const revoked = await tx.qrCredential.updateMany({
        where: { isActive: true, guest: { eventId } },
        data: { isActive: false, revokedAt: new Date() },
      });
      const guests = await tx.guest.findMany({ where: { eventId, status: "ACTIVE" }, select: { id: true } });
      await tx.qrCredential.createMany({
        data: guests.map((g) => {
          const t = issueToken();
          return { guestId: g.id, tokenHash: t.tokenHash, tokenLast4: t.tokenLast4, tokenEncrypted: t.tokenEncrypted };
        }),
      });
      await AuditLog.record(
        { userId, action: "qr.reissue_all", entityType: "event", entityId: eventId, after: { revoked: revoked.count, created: guests.length }, reason },
        tx,
      );
      return { revoked: revoked.count, created: guests.length };
    },
    { timeout: 60_000 },
  );
}

async function findGuest(guestId: number, client: DbClient) {
  const guest = await client.guest.findUnique({ where: { id: guestId } });
  if (!guest) throw new HttpError(404, "Tamu tidak ditemukan");
  return guest;
}

/**
 * Terbitkan QR untuk satu tamu. Jika sudah punya QR aktif, ini penerbitan ULANG:
 * QR lama dicabut (gelang lama tidak berlaku) dan alasan wajib diisi.
 */
export async function issueForGuest(guestId: number, userId: number, reason: string | null) {
  return db.$transaction(async (tx) => {
    const guest = await findGuest(guestId, tx);
    if (guest.status !== "ACTIVE") throw new HttpError(422, "Tamu dibatalkan; aktifkan dulu sebelum menerbitkan QR");
    await QrCredential.lock(guest.eventId, tx);
    const old = await QrCredential.active(guestId, tx);
    if (old && !reason) throw new HttpError(422, "Tamu sudah punya QR aktif. Isi alasan untuk menerbitkan ulang.");
    if (old) await QrCredential.revokeActive(guestId, tx);
    const created = await QrCredential.create(guestId, issueToken(), tx);
    await AuditLog.record(
      {
        userId,
        action: old ? "qr.reissue" : "qr.issue",
        entityType: "guest",
        entityId: guestId,
        before: old ? { credentialId: old.id, tokenLast4: old.tokenLast4 } : null,
        after: { credentialId: created.id, tokenLast4: created.tokenLast4 },
        reason,
      },
      tx,
    );
    return created;
  });
}

/** Cabut QR aktif tamu (wajib alasan). */
export async function revokeForGuest(guestId: number, userId: number, reason: string) {
  return db.$transaction(async (tx) => {
    const guest = await findGuest(guestId, tx);
    await QrCredential.lock(guest.eventId, tx);
    const old = await QrCredential.active(guestId, tx);
    if (!old) throw new HttpError(422, "Tamu tidak punya QR aktif");
    await QrCredential.revokeActive(guestId, tx);
    await AuditLog.record(
      { userId, action: "qr.revoke", entityType: "guest", entityId: guestId, before: { credentialId: old.id, tokenLast4: old.tokenLast4 }, reason },
      tx,
    );
    return { revoked: true };
  });
}
