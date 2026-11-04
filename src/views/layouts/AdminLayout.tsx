import Image from "next/image";
import { navFor } from "@/config/nav";
import { ROLE_LABELS } from "@/lib/roles";
import { logout } from "@/Http/Controllers/AuthController";
import type { UserRow } from "@/Models/User";
import { Button } from "@/views/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import { EventPicker } from "./EventPicker";

type Props = {
  user: UserRow;
  events: { id: number; name: string }[];
  activeEventId: number | null;
  children: React.ReactNode;
};

export function AdminLayout({ user, events, activeEventId, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:w-56 md:shrink-0 md:border-r md:border-b-0">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} />
          <span className="font-semibold">VenuePass</span>
        </div>
        <SidebarNav items={navFor(user.role)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Event:</span>
            <EventPicker events={events} activeId={activeEventId} />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</div>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
