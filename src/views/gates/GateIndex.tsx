"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { OfficersDialog } from "./OfficersDialog";

export type GateItem = { id: number; name: string; isActive: boolean; officers: { id: number; name: string }[] };
export type OfficerOption = { id: number; name: string; email: string };

type Props = { eventName: string; gates: GateItem[]; officers: OfficerOption[] };

export function GateIndex({ eventName, gates, officers }: Props) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<GateItem | null>(null);
  const [pending, setPending] = useState(false);

  async function addGate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = String(new FormData(form).get("name"));
    setPending(true);
    const res = await apiSend("/api/gates", "POST", { name });
    setPending(false);
    if (!res.ok) return toast.error(res.error === "Data sudah ada (duplikat)" ? `Gate "${name}" sudah ada di event ini` : res.error);
    toast.success(`Gate ${name} ditambahkan`);
    form.reset();
    router.refresh();
  }

  async function patch(gate: GateItem, data: { name?: string; isActive?: boolean }, message: string) {
    const res = await apiSend(`/api/gates/${gate.id}`, "PATCH", data);
    if (!res.ok) return toast.error(res.error === "Data sudah ada (duplikat)" ? "Nama gate sudah dipakai" : res.error);
    toast.success(message);
    router.refresh();
  }

  function rename(gate: GateItem) {
    const name = prompt("Nama gate baru", gate.name)?.trim();
    if (name && name !== gate.name) patch(gate, { name }, "Nama gate diubah");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Gate & Petugas</h1>
        <p className="text-sm text-muted-foreground">Event: {eventName}</p>
      </div>

      <form onSubmit={addGate} className="flex max-w-md gap-2">
        <Input name="name" placeholder="Nama gate, mis. Gate A" required maxLength={100} />
        <Button type="submit" disabled={pending}>
          Tambah gate
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Petugas</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {gates.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Belum ada gate untuk event ini.
                </TableCell>
              </TableRow>
            )}
            {gates.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>
                  <Badge variant={g.isActive ? "default" : "outline"}>{g.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell className="whitespace-normal">
                  {g.officers.length ? g.officers.map((o) => o.name).join(", ") : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAssigning(g)}>
                      Atur petugas
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => rename(g)}>
                      Ubah nama
                    </Button>
                    <Button
                      variant={g.isActive ? "destructive" : "secondary"}
                      size="sm"
                      onClick={() => patch(g, { isActive: !g.isActive }, g.isActive ? "Gate dinonaktifkan" : "Gate diaktifkan")}
                    >
                      {g.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OfficersDialog gate={assigning} officers={officers} onClose={() => setAssigning(null)} />
    </div>
  );
}
