import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import QRCode from "qrcode";
import { decryptToken, encryptToken, hashToken, issueToken, normalizeToken, TOKEN_PREFIX } from "./qr";

const key = randomBytes(32);

describe("token QR", () => {
  it("format VP2- + 128 bit base32 huruf besar (26 karakter), tanpa data pribadi", () => {
    const { token } = issueToken(key);
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(token.slice(4)).toMatch(/^[A-Z2-7]{26}$/);
  });

  it("muat di QR versi 2 (25×25) mode alfanumerik, EC M", () => {
    const qr = QRCode.create(issueToken(key).token, { errorCorrectionLevel: "M" });
    expect(qr.version).toBe(2);
    expect(qr.modules.size).toBe(25);
  });

  it("normalizeToken: trim, VP2 jadi huruf besar, VP1 tidak diubah", () => {
    expect(normalizeToken("  vp2-abcdef234\r\n")).toBe("VP2-ABCDEF234");
    expect(normalizeToken(" VP1_aBc-_x ")).toBe("VP1_aBc-_x");
  });

  it("hash sha256 hex, last4, dan enkripsi bisa dibuka kembali", () => {
    const t = issueToken(key);
    expect(t.tokenHash).toBe(hashToken(t.token));
    expect(t.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(t.tokenLast4).toBe(t.token.slice(-4));
    expect(t.tokenEncrypted).not.toContain(t.token.slice(4, 20));
    expect(decryptToken(t.tokenEncrypted, key)).toBe(t.token);
  });

  it("1000 token unik", () => {
    const hashes = new Set(Array.from({ length: 1000 }, () => issueToken(key).tokenHash));
    expect(hashes.size).toBe(1000);
  });

  it("kunci salah atau data diubah -> gagal dekripsi", () => {
    const enc = encryptToken("VP1_abc", key);
    expect(() => decryptToken(enc, randomBytes(32))).toThrow();
    const tampered = Buffer.from(enc, "base64");
    tampered[tampered.length - 1] ^= 1;
    expect(() => decryptToken(tampered.toString("base64"), key)).toThrow();
  });
});
