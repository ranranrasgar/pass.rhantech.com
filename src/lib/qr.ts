// Token QR (PRD §9.4, §10.1; keputusan §1.3 #2).
// - Token mentah (format VP2): "VP2-" + 16 byte acak (128 bit) dalam base32 huruf besar
//   (26 karakter). Semua karakter masuk mode ALFANUMERIK QR -> cukup QR versi 2 (25×25
//   modul) sehingga modul lebih besar & terbaca dari jauh. Token lama "VP1_" (32 byte
//   base64url) tetap sah karena scan mencari berdasarkan hash, bukan format.
// - DB menyimpan sha256 (lookup saat scan), 4 karakter terakhir, dan salinan
//   terenkripsi AES-256-GCM (QR_ENC_KEY) khusus untuk cetak ulang.
// Token mentah TIDAK boleh muncul di log, respons API, atau scan_logs.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "VP2-";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 tanpa padding. */
function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Rapikan hasil scan: spasi/Enter dibuang; token VP2 dijadikan huruf besar
 * (scanner USB dengan Caps Lock bisa mengirim huruf kecil). VP1 peka huruf -> tidak diubah.
 */
export function normalizeToken(raw: string): string {
  const t = raw.trim();
  return /^vp2-/i.test(t) ? t.toUpperCase() : t;
}

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
  const token = TOKEN_PREFIX + base32(randomBytes(16));
  return { token, tokenHash: hashToken(token), tokenLast4: token.slice(-4), tokenEncrypted: encryptToken(token, key) };
}
