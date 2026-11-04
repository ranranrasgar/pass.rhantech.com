"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/views/components/ui/dialog";
import { FieldError } from "@/views/components/FieldError";
import type { GuestItem } from "./GuestIndex";

type Props = { open: boolean; onOpenChange: (open: boolean) => void; guest: GuestItem | null; groups: string[] };

export function GuestFormDialog({ open, onOpenChange, guest, groups }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    const res = guest ? await apiSend(`/api/guests/${guest.id}`, "PATCH", form) : await apiSend("/api/guests", "POST", form);
    setPending(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      toast.error(res.error === "Data sudah ada (duplikat)" ? "Kode tamu sudah dipakai di event ini" : res.error);
      return;
    }
    toast.success(guest ? "Data tamu diperbarui" : "Tamu ditambahkan");
    setFields({});
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{guest ? "Ubah tamu" : "Tambah tamu"}</DialogTitle>
        </DialogHeader>
        <form key={guest?.id ?? "new"} onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-name">Nama</Label>
            <Input id="g-name" name="name" defaultValue={guest?.name} required maxLength={191} />
            <FieldError messages={fields.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-group">Grup</Label>
              <Input id="g-group" name="groupName" list="g-groups" defaultValue={guest?.groupName} required maxLength={100} />
              <datalist id="g-groups">
                {groups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <FieldError messages={fields.groupName} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-code">Kode tamu</Label>
              <Input id="g-code" name="externalCode" defaultValue={guest?.externalCode ?? ""} maxLength={100} placeholder="Kosongkan = otomatis" />
              <FieldError messages={fields.externalCode} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-notes">Catatan (opsional)</Label>
            <Input id="g-notes" name="notes" defaultValue={guest?.notes ?? ""} maxLength={1000} />
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
