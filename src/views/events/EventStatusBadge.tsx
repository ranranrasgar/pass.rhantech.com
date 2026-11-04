import type { EventStatus } from "@/generated/prisma/enums";
import { Badge } from "@/views/components/ui/badge";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Aktif",
  CLOSED: "Ditutup",
};

const VARIANT = { DRAFT: "secondary", ACTIVE: "default", CLOSED: "outline" } as const;

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge variant={VARIANT[status]}>{EVENT_STATUS_LABELS[status]}</Badge>;
}
