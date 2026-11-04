"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import type { EventStatus } from "@/generated/prisma/enums";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/views/components/ui/dialog";
import { NativeSelect } from "@/views/components/NativeSelect";
import { FieldError } from "@/views/components/FieldError";
import { EVENT_STATUS_LABELS } from "./EventStatusBadge";

export type EventItem = { id: number; name: string; venueName: string; eventDate: string; dateLabel: string; status: EventStatus };

type Props = { open: boolean; onOpenChange: (open: boolean) => void; event: EventItem | null };

export function EventFormDialog({ open, onOpenChange, event }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fields, setFields] = useState<Record<string, string[] | undefined>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setPending(true);
    const res = event ? await apiSend(`/api/events/${event.id}`, "PATCH", form) : await apiSend("/api/events", "POST", form);
    setPending(false);
    if (!res.ok) {
      setFields(res.fields ?? {});
      toast.error(res.error);
      return;
    }
    toast.success(event ? "Event diperbarui" : "Event dibuat");
    setFields({});
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Ubah event" : "Tambah event"}</DialogTitle>
        </DialogHeader>
        {/* key: reset nilai default saat event yang diedit berganti */}
        <form key={event?.id ?? "new"} onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ev-name">Nama event</Label>
            <Input id="ev-name" name="name" defaultValue={event?.name} required />
            <FieldError messages={fields.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-venue">Venue</Label>
            <Input id="ev-venue" name="venueName" defaultValue={event?.venueName} required />
            <FieldError messages={fields.venueName} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Tanggal</Label>
              <Input id="ev-date" name="eventDate" type="date" defaultValue={event?.eventDate} required />
              <FieldError messages={fields.eventDate} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-status">Status</Label>
              <NativeSelect id="ev-status" name="status" defaultValue={event?.status ?? "DRAFT"}>
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </NativeSelect>
            </div>
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
