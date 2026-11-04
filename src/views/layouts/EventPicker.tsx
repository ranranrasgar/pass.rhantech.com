"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { NativeSelect } from "@/views/components/NativeSelect";

type Option = { id: number; name: string };

/** Pemilih event aktif (disimpan di cookie lewat POST /api/active-event). */
export function EventPicker({ events, activeId }: { events: Option[]; activeId: number | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (events.length === 0) return <span className="text-sm text-muted-foreground">Belum ada event</span>;

  return (
    <NativeSelect
      aria-label="Event aktif"
      className="w-auto max-w-64"
      value={activeId ?? ""}
      disabled={pending}
      onChange={(e) => {
        const eventId = Number(e.target.value);
        startTransition(async () => {
          const res = await apiSend("/api/active-event", "POST", { eventId });
          if (!res.ok) toast.error(res.error);
          router.refresh();
        });
      }}
    >
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>
          {ev.name}
        </option>
      ))}
    </NativeSelect>
  );
}
