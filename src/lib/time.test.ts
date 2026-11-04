import { describe, expect, it } from "vitest";
import { localDateToUtc, utcToLocalDate } from "./time";

describe("zona waktu", () => {
  it("tanggal lokal Jakarta 00:00 disimpan sebagai 17:00 UTC hari sebelumnya", () => {
    expect(localDateToUtc("2026-11-20", "Asia/Jakarta").toISOString()).toBe("2026-11-19T17:00:00.000Z");
  });

  it("bolak-balik UTC <-> tanggal lokal konsisten", () => {
    for (const tz of ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "UTC"]) {
      expect(utcToLocalDate(localDateToUtc("2026-01-31", tz), tz)).toBe("2026-01-31");
    }
  });
});
