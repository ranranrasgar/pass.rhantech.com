import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("hash tidak sama dengan password asli dan bisa diverifikasi", async () => {
    const hash = await hashPassword("rahasia-123");
    expect(hash).not.toContain("rahasia-123");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("rahasia-123", hash)).toBe(true);
  });

  it("password salah ditolak", async () => {
    const hash = await hashPassword("rahasia-123");
    expect(await verifyPassword("rahasia-124", hash)).toBe(false);
  });

  it("hash berbeda untuk password yang sama (salt acak)", async () => {
    expect(await hashPassword("sama")).not.toBe(await hashPassword("sama"));
  });
});
