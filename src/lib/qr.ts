// Token QR (PRD §9.4, §10.1; keputusan §1.3 #2).
// - Token mentah: "VP1_" + 32 byte acak base64url. Hanya ada di QR yang dicetak.
// - DB menyimpan sha256 (lookup saat scan), 4 karakter terakhir, dan salinan
//   terenkripsi AES-256-GCM (QR_ENC_KEY) khusus untuk cetak ulang.
// Token mentah TIDAK boleh muncul di log, respons API, atau scan_logs.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "VP1_";

export type IssuedToken = { token: string; tokenHash: string; tokenLast4: string; tokenEncrypted: string };

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function encKey(): Buffer {
  const raw = process.env.QR_ENC_KEY;
  const key = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (key.length !== 32) throw new Error("QR_ENC_KEY harus 32 byte base64 (lihat .env.example)");
  return key;
}

/** iv(12) + tag(16) + ciphertext, base64. */
export function encryptToken(token: string, key = encKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}

export function decryptToken(encrypted: string, key = encKey()): string {
  const buf = Buffer.from(encrypted, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

export function issueToken(key = encKey()): IssuedToken {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token), tokenLast4: token.slice(-4), tokenEncrypted: encryptToken(token, key) };
}
