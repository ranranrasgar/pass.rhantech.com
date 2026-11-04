import { Role } from "@/generated/prisma/enums";

export { Role };

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin Event",
  GATE_OFFICER: "Petugas Gate",
  VIEWER: "Viewer",
};

export const ALL_ROLES = Object.values(Role) as Role[];

/** Guard role: tanpa daftar `allowed` berarti semua role yang login boleh. */
export function hasRole(role: Role, allowed?: readonly Role[]): boolean {
  return !allowed || allowed.includes(role);
}
