import "server-only";
import { db } from "@/lib/db";
import type { PrintPreset as Row } from "@/generated/prisma/client";
import type { PresetOptions } from "@/config/printPresets";

/** Baris DB -> opsi cetak (Decimal -> number, fields JSON). */
export function toOptions(p: Row): PresetOptions {
  return {
    paper: p.paper,
    orientation: p.orientation,
    widthMm: Number(p.widthMm),
    heightMm: Number(p.heightMm),
    marginMm: Number(p.marginMm),
    gapXMm: Number(p.gapXMm),
    gapYMm: Number(p.gapYMm),
    columns: p.columns,
    qrSizeMm: Number(p.qrSizeMm),
    theme: p.theme,
    fields: p.fields as PresetOptions["fields"],
  };
}

export const PrintPreset = {
  async all() {
    const rows = await db.printPreset.findMany({ orderBy: { name: "asc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, options: toOptions(r) }));
  },

  /** Simpan (buat baru atau timpa preset dengan nama sama). */
  upsert(name: string, o: PresetOptions) {
    const data = {
      widthMm: o.widthMm,
      heightMm: o.heightMm,
      marginMm: o.marginMm,
      gapXMm: o.gapXMm,
      gapYMm: o.gapYMm,
      columns: o.columns,
      orientation: o.orientation,
      paper: o.paper,
      theme: o.theme,
      qrSizeMm: o.qrSizeMm,
      fields: o.fields,
    };
    return db.printPreset.upsert({ where: { name }, create: { name, ...data }, update: data });
  },

  delete(id: number) {
    return db.printPreset.delete({ where: { id } });
  },
};
