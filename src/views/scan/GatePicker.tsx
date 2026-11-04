import Link from "next/link";
import { logout } from "@/Http/Controllers/AuthController";

type GateOption = { id: number; name: string; eventName: string };

/** Petugas memilih gate tempat bertugas (hanya gate yang ditugaskan & aktif). */
export function GatePicker({ gates, officerName, canLeave }: { gates: GateOption[]; officerName: string; canLeave: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-black p-4 text-white">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <div>
          <div className="text-xs font-bold tracking-widest text-primary">VENUEPASS</div>
          <h1 className="text-3xl font-black">Pilih gate</h1>
          <p className="text-neutral-300">Petugas: {officerName}</p>
        </div>
        {gates.length === 0 ? (
          <p className="rounded-2xl bg-neutral-900 p-5 text-lg">
            Belum ada gate aktif untuk Anda. Minta admin menugaskan Anda ke gate dan memastikan event berstatus Aktif.
          </p>
        ) : (
          <ul className="space-y-3">
            {gates.map((g) => (
              <li key={g.id}>
                <Link href={`/scan?gate=${g.id}`} className="block rounded-2xl bg-neutral-900 p-5 hover:bg-neutral-800">
                  <div className="text-2xl font-black">{g.name}</div>
                  <div className="text-neutral-300">{g.eventName}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between text-sm text-neutral-400">
          {canLeave ? (
            <Link href="/dashboard" className="underline">
              Kembali ke dashboard
            </Link>
          ) : (
            <span />
          )}
          <form action={logout}>
            <button type="submit" className="underline">
              Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
