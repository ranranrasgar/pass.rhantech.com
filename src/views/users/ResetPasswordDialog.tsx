"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/views/components/ui/dialog";
import { FieldError } from "@/views/components/FieldError";
import type { UserItem } from "./UserFormDialog";

type Props = { user: UserItem | null; onClose: () => void };

export function ResetPasswordDialog({ user, onClose }: Props) {
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const password = String(new FormData(e.currentTarget).get("password"));
    setPending(true);
    const res = await apiSend(`/api/users/${user.id}/reset-password`, "POST", { password });
    setPending(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      toast.error(res.error);
      return;
    }
    toast.success(`Password ${user.name} direset`);
    setFields({});
    onClose();
  }

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>{user?.name} — {user?.email}</DialogDescription>
        </DialogHeader>
        <form key={user?.id} onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rp-password">Password baru</Label>
            <Input id="rp-password" name="password" type="password" minLength={8} autoComplete="new-password" required />
            <FieldError messages={fields.password} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
