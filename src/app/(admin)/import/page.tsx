import type { Metadata } from "next";
import { rolesFor } from "@/config/nav";
import { formatDateTime } from "@/lib/time";
import { requirePageUser } from "@/Http/Middleware/Authenticate";
import { ImportBatch } from "@/Models/ImportBatch";
import { getActiveEvent } from "@/Services/ActiveEventService";
import { ImportIndex } from "@/views/imports/ImportIndex";
import { NoActiveEvent } from "@/views/components/NoActiveEvent";

export const metadata: Metadata = { title: "Impor Data" };

export default async function ImportPage() {
  await requirePageUser(rolesFor("/import"));
  const event = await getActiveEvent();
  if (!event) return <NoActiveEvent title="Impor Data" />;
  const batches = await ImportBatch.forEvent(event.id);
  return (
    <ImportIndex
      eventName={event.name}
      batches={batches.map((b) => ({
        id: b.id,
        fileName: b.fileName,
        totalRows: b.totalRows,
        successRows: b.successRows,
        failedRows: b.failedRows,
        createdLabel: formatDateTime(b.createdAt),
        userName: b.user.name,
      }))}
    />
  );
}
