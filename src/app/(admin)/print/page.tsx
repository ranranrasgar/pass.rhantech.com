import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { Guest } from "@/Models/Guest";
import { PrintPreset } from "@/Models/PrintPreset";
import { QrCredential } from "@/Models/QrCredential";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { PrintIndex } from "@/views/print/PrintIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "QR & Cetak" };

export default async function PrintPage() {
  await requirePageUser(rolesFor("/print"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="QR & Cetak" />;
  const [summary, groups, saved] = await Promise.all([QrCredential.summary(event.id), Guest.groups(event.id), PrintPreset.all()]);
  return <PrintIndex eventName={event.name} summary={summary} groups={groups} saved={saved} />;
}
