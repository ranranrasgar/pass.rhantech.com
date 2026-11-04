import Image from "next/image";
import { navFor } from "@/config/nav";
import { ROLE_LABELS } from "@/lib/roles";
import { logout } from "@/Http/Controllers/AuthController";
import type { UserRow } from "@/Models/User";
import { Button } from "@/views/components/ui/button";
import { SidebarNav } from "./SidebarNav";
import { EventPicker } from "./EventPicker";
import { MobileNav } from "./MobileNav";

type Props = {
  user: UserRow;
  events: { id: number; name: string }[];
  activeEventId: number | null;
  testModeEvent: string | null; // nama event aktif bila sedang Mode Uji
  children: React.ReactNode;
};

export function AdminLayout({ user, events, activeEventId, testModeEvent, children }: Props) {
  const items = navFor(user.role);
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav items={items} userName={user.name} roleLabel={ROLE_LABELS[user.role]} />
      {/* Desktop: sidebar tetap. Ponsel: diganti MobileNav. */}
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground md:block md:w-56 md:shrink-0">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} />
          <span className="font-semibold">VenuePass</span>
        </div>
        <SidebarNav items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">Event:</span>
            <EventPicker events={events} activeId={activeEventId} />
          </div>
          {/* Nama & tombol Keluar di ponsel ada di MobileNav. */}
          <div className="hidden shrink-0 items-center gap-3 md:flex">
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
        {testModeEvent && (
          <div role="status" className="bg-amber-400 px-4 py-2 text-center text-sm font-bold text-black">
            MODE UJI — {testModeEvent}: scan & check-in ditandai UJI dan dihapus saat Mode Uji diakhiri (Pengaturan).
          </div>
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
