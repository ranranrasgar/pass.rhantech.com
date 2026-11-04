import { describe, expect, it } from "vitest";
import { StoreGuestRequest } from "./GuestRequest";

describe("StoreGuestRequest", () => {
  it("kode & catatan yang tidak dikirim menjadi null (agar kode dibuat otomatis)", () => {
    expect(StoreGuestRequest.parse({ name: "Ani", groupName: "AMP" })).toEqual({
      name: "Ani",
      groupName: "AMP",
      externalCode: null,
      notes: null,
    });
  });

  it("kode kosong / spasi menjadi null, kode terisi dirapikan", () => {
    expect(StoreGuestRequest.parse({ name: "Ani", groupName: "AMP", externalCode: "  " }).externalCode).toBeNull();
    expect(StoreGuestRequest.parse({ name: "Ani", groupName: "AMP", externalCode: " 0007 " }).externalCode).toBe("0007");
  });
});
