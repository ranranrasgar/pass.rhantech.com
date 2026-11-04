"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { NativeSelect } from "@/views/components/NativeSelect";

export type GuestFilterValues = { q?: string; group?: string; status?: string };

/** Filter ditaruh di URL (?q=&group=&status=) agar paginasi server & tautan bisa dibagikan. */
export function GuestFilters({ groups, values }: { groups: string[]; values: GuestFilterValues }) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (String(v)) params.set(k, String(v));
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  return (
    <form
      key={JSON.stringify(values)}
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      <Input name="q" placeholder="Cari nama / kode" defaultValue={values.q} className="w-56" />
      <NativeSelect name="group" defaultValue={values.group ?? ""} className="w-44" onChange={(e) => apply(e.currentTarget.form!)}>
        <option value="">Semua grup</option>
        {groups.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect name="status" defaultValue={values.status ?? ""} className="w-36" onChange={(e) => apply(e.currentTarget.form!)}>
        <option value="">Semua status</option>
        <option value="ACTIVE">Aktif</option>
        <option value="CANCELLED">Dibatalkan</option>
      </NativeSelect>
      <Button type="submit" variant="outline">
        Cari
      </Button>
    </form>
  );
}
