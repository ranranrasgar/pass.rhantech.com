import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const ACTIVE_EVENT_COOKIE = "vp_event";

/** Event aktif dari cookie; jika tidak valid -> event ACTIVE terbaru -> event terbaru. */
export async function getActiveEvent() {
  const id = Number((await cookies()).get(ACTIVE_EVENT_COOKIE)?.value);
  if (Number.isInteger(id) && id > 0) {
    const event = await db.event.findUnique({ where: { id } });
    if (event) return event;
  }
  return (
    (await db.event.findFirst({ where: { status: "ACTIVE" }, orderBy: { eventDate: "desc" } })) ??
    (await db.event.findFirst({ orderBy: { eventDate: "desc" } }))
  );
}

export async function setActiveEvent(eventId: number) {
  (await cookies()).set(ACTIVE_EVENT_COOKIE, String(eventId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
