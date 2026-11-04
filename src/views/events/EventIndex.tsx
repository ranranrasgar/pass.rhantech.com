"use client";

import { useState } from "react";
import { Button } from "@/views/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/views/components/ui/table";
import { EventFormDialog, type EventItem } from "./EventFormDialog";
import { EventStatusBadge } from "./EventStatusBadge";

export function EventIndex({ events }: { events: EventItem[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);

  function openForm(event: EventItem | null) {
    setEditing(event);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Event</h1>
        <Button onClick={() => openForm(null)}>Tambah event</Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada event.
                </TableCell>
              </TableRow>
            )}
            {events.map((ev) => (
              <TableRow key={ev.id}>
                <TableCell className="font-medium">{ev.name}</TableCell>
                <TableCell>{ev.venueName}</TableCell>
                <TableCell>{ev.dateLabel}</TableCell>
                <TableCell>
                  <EventStatusBadge status={ev.status} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openForm(ev)}>
                    Ubah
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EventFormDialog open={open} onOpenChange={setOpen} event={editing} />
    </div>
  );
}
