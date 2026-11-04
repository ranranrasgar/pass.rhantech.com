import { describe, expect, it } from "vitest";
import { hasRole, Role } from "./roles";
import { navFor, rolesFor } from "@/config/nav";

describe("guard role", () => {
  it("tanpa daftar role: semua role yang login boleh", () => {
    for (const role of Object.values(Role)) expect(hasRole(role)).toBe(true);
  });

  it("hanya role dalam daftar yang boleh", () => {
    const managers = [Role.SUPER_ADMIN, Role.ADMIN];
    expect(hasRole(Role.SUPER_ADMIN, managers)).toBe(true);
    expect(hasRole(Role.ADMIN, managers)).toBe(true);
    expect(hasRole(Role.VIEWER, managers)).toBe(false);
    expect(hasRole(Role.GATE_OFFICER, managers)).toBe(false);
  });

  it("halaman Event & Pengguna memakai role yang benar", () => {
    expect(hasRole(Role.VIEWER, rolesFor("/events"))).toBe(false);
    expect(hasRole(Role.ADMIN, rolesFor("/events"))).toBe(true);
    expect(hasRole(Role.ADMIN, rolesFor("/users"))).toBe(false);
    expect(hasRole(Role.SUPER_ADMIN, rolesFor("/users"))).toBe(true);
  });
});

describe("menu per role", () => {
  const hrefs = (role: Role) => navFor(role).map((i) => i.href);

  it("Super Admin melihat semua menu Fase 1–3", () => {
    expect(hrefs(Role.SUPER_ADMIN)).toEqual(["/dashboard", "/events", "/gates", "/guests", "/import", "/print", "/users"]);
  });

  it("Admin tidak melihat Pengguna", () => {
    expect(hrefs(Role.ADMIN)).toEqual(["/dashboard", "/events", "/gates", "/guests", "/import", "/print"]);
  });

  it("Viewer & Petugas hanya Dashboard", () => {
    expect(hrefs(Role.VIEWER)).toEqual(["/dashboard"]);
    expect(hrefs(Role.GATE_OFFICER)).toEqual(["/dashboard"]);
  });
});
