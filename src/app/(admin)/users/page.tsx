import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { formatDate } from "@/lib/time";
import { User } from "@/Models/User";
import { UserIndex } from "@/views/users/UserIndex";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage() {
  const me = await requirePageUser(rolesFor("/users"));
  const users = await User.all();
  return (
    <UserIndex
      meId={me.id}
      users={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdLabel: formatDate(u.createdAt),
      }))}
    />
  );
}
