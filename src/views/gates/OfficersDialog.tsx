"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Button } from "@/views/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/views/components/ui/dialog";
import type { GateItem, OfficerOption } from "./GateIndex";

type Props = { gate: GateItem | null; officers: OfficerOption[]; onClose: () => void };

/** Pilih petugas (multi) untuk satu gate. Satu petugas boleh di beberapa gate. */
export function OfficersDialog({ gate, officers, onClose }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!gate) return;
    const userIds = new FormData(e.currentTarget).getAll("userIds").map(Number);
    setPending(true);
    const res = await apiSend(`/api/gates/${gate.id}/officers`, "PUT", { userIds });
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Petugas ${gate.name} disimpan`);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={gate !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Petugas {gate?.name}</DialogTitle>
          <DialogDescription>Hanya pengguna aktif dengan role Petugas Gate.</DialogDescription>
        </DialogHeader>
        <form key={gate?.id} onSubmit={onSubmit} className="space-y-3">
          {officers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada Petugas Gate. Tambahkan di menu Pengguna.</p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {officers.map((o) => (
                <label key={o.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    name="userIds"
                    value={o.id}
                    defaultChecked={gate?.officers.some((g) => g.id === o.id)}
                    className="size-4 accent-primary"
                  />
                  <span>{o.name}</span>
                  <span className="text-xs text-muted-foreground">{o.email}</span>
                </label>
              ))}
            </div>
          )}
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
