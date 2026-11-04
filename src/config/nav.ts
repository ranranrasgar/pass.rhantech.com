// Satu-satunya sumber menu. Tambahkan item HANYA saat fiturnya sudah jalan end-to-end.
import { hasRole, Role } from "@/lib/roles";

export type NavItem = { label: string; href: string; roles?: readonly Role[] };

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Event", href: "/events", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Gate & Petugas", href: "/gates", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Data Tamu", href: "/guests", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Impor Data", href: "/import", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Pengguna", href: "/users", roles: [Role.SUPER_ADMIN] },
];

export function navFor(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => hasRole(role, item.roles));
}

/** Role yang boleh membuka halaman `href` (dipakai juga oleh guard halaman). */
export function rolesFor(href: string): readonly Role[] | undefined {
  return NAV_ITEMS.find((item) => item.href === href)?.roles;
}
