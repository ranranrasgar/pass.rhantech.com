import { describe, expect, it } from "vitest";
import { createLimiter } from "./rateLimit";

describe("rate limit login", () => {
  it("blokir setelah 5 kali gagal dalam jendela waktu", () => {
    const l = createLimiter(5, 60_000);
    for (let i = 0; i < 4; i++) l.fail("a", 1000 + i);
    expect(l.blockedFor("a", 2000)).toBe(0);
    l.fail("a", 1004);
    expect(l.blockedFor("a", 2000)).toBe(60_000 - 1000);
    expect(l.blockedFor("b", 2000)).toBe(0); // kunci lain tidak terpengaruh
  });

  it("blokir hilang setelah jendela lewat, dan reset setelah login berhasil", () => {
    const l = createLimiter(2, 1000);
    l.fail("a", 0);
    l.fail("a", 10);
    expect(l.blockedFor("a", 500)).toBeGreaterThan(0);
    expect(l.blockedFor("a", 1001)).toBe(0); // gagal pertama sudah kedaluwarsa
    l.fail("a", 1002);
    l.fail("a", 1003);
    expect(l.blockedFor("a", 1004)).toBeGreaterThan(0);
    l.reset("a");
    expect(l.blockedFor("a", 1004)).toBe(0);
  });
});
