"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { UserFormDialog, type UserItem } from "./UserFormDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

export function UserIndex({ users, meId }: { users: UserItem[]; meId: number }) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [resetting, setResetting] = useState<UserItem | null>(null);

  function openForm(user: UserItem | null) {
    setEditing(user);
    setFormOpen(true);
  }

  async function toggleActive(user: UserItem) {
    const verb = user.isActive ? "Nonaktifkan" : "Aktifkan";
    if (!confirm(`${verb} ${user.name}?`)) return;
    const res = await apiSend(`/api/users/${user.id}`, "PATCH", { isActive: !user.isActive });
    if (!res.ok) return toast.error(res.error);
    toast.success(`${user.name} ${user.isActive ? "dinonaktifkan" : "diaktifkan"}`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pengguna</h1>
        <Button onClick={() => openForm(null)}>Tambah pengguna</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role]}</TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "default" : "outline"}>{u.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell>{u.createdLabel}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(u)}>
                      Ubah
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setResetting(u)}>
                      Reset password
                    </Button>
                    {u.id !== meId && (
                      <Button variant={u.isActive ? "destructive" : "secondary"} size="sm" onClick={() => toggleActive(u)}>
                        {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}
