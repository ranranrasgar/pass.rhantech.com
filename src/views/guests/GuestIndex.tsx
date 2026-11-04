"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { GuestFilters, type GuestFilterValues } from "./GuestFilters";
import { GuestFormDialog } from "./GuestFormDialog";
import { GuestQrActions, QrBadge } from "./GuestQrActions";

export type GuestItem = {
  id: number;
  externalCode: string | null;
  name: string;
  groupName: string;
  status: "ACTIVE" | "CANCELLED";
  notes: string | null;
  qr: "ACTIVE" | "REVOKED" | "NONE";
};

type Props = {
  eventName: string;
  guests: GuestItem[];
  groups: string[];
  filters: GuestFilterValues;
  page: number;
  perPage: number;
  total: number;
};

export function GuestIndex({ eventName, guests, groups, filters, page, perPage, total }: Props) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GuestItem | null>(null);
  const pages = Math.max(1, Math.ceil(total / perPage));

  function pageHref(p: number) {
    const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
    if (p > 1) params.set("page", String(p));
    return params.size ? `/guests?${params}` : "/guests";
  }

  function openForm(guest: GuestItem | null) {
    setEditing(guest);
    setFormOpen(true);
  }

  async function toggleCancel(g: GuestItem) {
    const cancel = g.status === "ACTIVE";
    if (!confirm(`${cancel ? "Batalkan tiket" : "Aktifkan kembali"} ${g.name}?`)) return;
    const res = await apiSend(`/api/guests/${g.id}`, "PATCH", { status: cancel ? "CANCELLED" : "ACTIVE" });
    if (!res.ok) return toast.error(res.error);
    toast.success(cancel ? `${g.name} dibatalkan` : `${g.name} diaktifkan kembali`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Data Tamu</h1>
          <p className="text-sm text-muted-foreground">
            Event: {eventName} · {total.toLocaleString("id-ID")} tamu
          </p>
        </div>
        <Button onClick={() => openForm(null)}>Tambah tamu</Button>
      </div>

      <GuestFilters groups={groups} values={filters} />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Grup</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QR</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Tidak ada tamu. Tambahkan manual atau lewat menu Impor Data.
                </TableCell>
              </TableRow>
            )}
            {guests.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="tabular-nums">{g.externalCode ?? "—"}</TableCell>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{g.groupName}</TableCell>
                <TableCell>
                  <Badge variant={g.status === "ACTIVE" ? "default" : "outline"}>{g.status === "ACTIVE" ? "Aktif" : "Dibatalkan"}</Badge>
                </TableCell>
                <TableCell>
                  <QrBadge qr={g.qr} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <GuestQrActions guest={g} />
                    <Button variant="outline" size="sm" onClick={() => openForm(g)}>
                      Ubah
                    </Button>
                    <Button variant={g.status === "ACTIVE" ? "destructive" : "secondary"} size="sm" onClick={() => toggleCancel(g)}>
                      {g.status === "ACTIVE" ? "Batalkan" : "Aktifkan"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Halaman {page} dari {pages}
        </span>
        <div className="flex gap-2">
          {page > 1 && <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">← Sebelumnya</Link>}
          {page < pages && <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1 hover:bg-muted">Berikutnya →</Link>}
        </div>
      </div>

      <GuestFormDialog open={formOpen} onOpenChange={setFormOpen} guest={editing} groups={groups} />
    </div>
  );
}
