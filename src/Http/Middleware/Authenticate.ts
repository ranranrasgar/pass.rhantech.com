import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasRole, type Role } from "@/lib/roles";
import { User, type UserRow } from "@/Models/User";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * User dari sesi, SELALU dibaca ulang dari DB (keputusan §1.3 #4):
 * user yang dinonaktifkan langsung kehilangan akses walau JWT masih berlaku.
 */
export async function currentUser(): Promise<UserRow | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const user = await User.find(id);
  return user?.isActive ? user : null;
}

/** Untuk API/controller: lempar 401/403. */
export async function requireUser(roles?: readonly Role[]): Promise<UserRow> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sesi berakhir, silakan login ulang");
  if (!hasRole(user.role, roles)) throw new HttpError(403, "Anda tidak berhak mengakses fitur ini");
  return user;
}

/** Untuk halaman: arahkan ke login / dashboard. */
export async function requirePageUser(roles?: readonly Role[]): Promise<UserRow> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!hasRole(user.role, roles)) redirect("/dashboard");
  return user;
}
