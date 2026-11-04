"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/views/components/ui/dialog";
import { NativeSelect } from "@/views/components/NativeSelect";
import { FieldError } from "@/views/components/FieldError";

export type UserItem = { id: number; name: string; email: string; role: Role; isActive: boolean; createdLabel: string };

type Props = { open: boolean; onOpenChange: (open: boolean) => void; user: UserItem | null };

/** Tambah (dengan password) atau ubah nama/email/role. */
export function UserFormDialog({ open, onOpenChange, user }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    const res = user ? await apiSend(`/api/users/${user.id}`, "PATCH", form) : await apiSend("/api/users", "POST", form);
    setPending(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      toast.error(res.error);
      return;
    }
    toast.success(user ? "Pengguna diperbarui" : "Pengguna dibuat");
    setFields({});
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle>
        </DialogHeader>
        <form key={user?.id ?? "new"} onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">Nama</Label>
            <Input id="u-name" name="name" defaultValue={user?.name} required />
            <FieldError messages={fields.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email</Label>
            <Input id="u-email" name="email" type="email" defaultValue={user?.email} required />
            <FieldError messages={fields.email} />
          </div>
          {!user && (
            <div className="space-y-1.5">
              <Label htmlFor="u-password">Password</Label>
              <Input id="u-password" name="password" type="password" minLength={8} autoComplete="new-password" required />
              <FieldError messages={fields.password} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="u-role">Role</Label>
            <NativeSelect id="u-role" name="role" defaultValue={user?.role ?? "GATE_OFFICER"}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <FieldError messages={fields.role} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
