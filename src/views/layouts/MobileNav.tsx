"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import type { NavItem } from "@/config/nav";
import { logout } from "@/Http/Controllers/AuthController";
import { cn } from "@/lib/utils";

type Props = { items: NavItem[]; userName: string; roleLabel: string };

/** Bar atas khusus layar kecil (< md): logo + tombol menu yang membuka daftar menu vertikal. */
export function MobileNav({ items, userName, roleLabel }: Props) {
  const pathname = usePathname();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname; // otomatis tertutup saat pindah halaman

  return (
    <div className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/icons/icon-192.png" alt="" width={28} height={28} />
          <span className="font-semibold">VenuePass</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpenAt(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
          Menu
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" className="border-t border-sidebar-border px-3 pt-2 pb-4">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpenAt(null)}
                    className={cn(
                      "block rounded-lg px-3 py-2.5 text-base font-medium",
                      active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-sidebar-border px-3 pt-3">
            <div className="text-sm leading-tight">
              <div className="font-medium">{userName}</div>
              <div className="text-xs opacity-70">{roleLabel}</div>
            </div>
            <form action={logout}>
              <button type="submit" className="rounded-lg border border-sidebar-border px-3 py-1.5 text-sm font-medium hover:bg-sidebar-accent">
                Keluar
              </button>
            </form>
          </div>
        </nav>
      )}
    </div>
  );
}
