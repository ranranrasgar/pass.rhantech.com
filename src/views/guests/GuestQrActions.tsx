"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { Badge } from "@/views/components/ui/badge";
import { Button } from "@/views/components/ui/button";
import type { GuestItem } from "./GuestIndex";

const QR_LABEL = { ACTIVE: "Punya QR", REVOKED: "Dicabut", NONE: "Belum" } as const;

export function QrBadge({ qr }: { qr: GuestItem["qr"] }) {
  const variant = qr === "ACTIVE" ? "default" : qr === "REVOKED" ? "destructive" : "outline";
  return <Badge variant={variant}>{QR_LABEL[qr]}</Badge>;
}

/** Terbitkan / terbitkan ulang (wajib alasan) / cabut (wajib alasan) QR satu tamu. */
export function GuestQrActions({ guest }: { guest: GuestItem }) {
  const router = useRouter();
  if (guest.status !== "ACTIVE") return null;

  async function issue() {
    let reason: string | null = null;
    if (guest.qr === "ACTIVE") {
      reason = prompt(`Terbitkan ulang QR ${guest.name}? Gelang lama tidak berlaku lagi.\nAlasan (mis. gelang hilang):`)?.trim() ?? null;
      if (!reason) return;
    }
    const res = await apiSend(`/api/guests/${guest.id}/issue-qr`, "POST", { reason });
    if (!res.ok) return toast.error(res.error);
    toast.success(reason ? `QR ${guest.name} diterbitkan ulang — cetak gelang baru` : `QR ${guest.name} dibuat`);
    router.refresh();
  }

  async function revoke() {
    const reason = prompt(`Cabut QR ${guest.name}? QR tidak bisa dipakai masuk.\nAlasan:`)?.trim();
    if (!reason) return;
    const res = await apiSend(`/api/guests/${guest.id}/revoke-qr`, "POST", { reason });
    if (!res.ok) return toast.error(res.error);
    toast.success(`QR ${guest.name} dicabut`);
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={issue}>
        {guest.qr === "ACTIVE" ? "Terbitkan ulang" : "Buat QR"}
      </Button>
      {guest.qr === "ACTIVE" && (
        <Button variant="outline" size="sm" onClick={revoke}>
          Cabut QR
        </Button>
      )}
    </>
  );
}
