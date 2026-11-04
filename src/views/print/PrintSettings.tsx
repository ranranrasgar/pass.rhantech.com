"use client";

import type { PresetOptions } from "@/config/printPresets";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { NativeSelect } from "@/views/components/NativeSelect";

type Props = { options: PresetOptions; onChange: (o: PresetOptions) => void };

const NUMBER_FIELDS: [keyof PresetOptions, string][] = [
  ["widthMm", "Lebar (mm)"],
  ["heightMm", "Tinggi (mm)"],
  ["qrSizeMm", "Ukuran QR (mm)"],
  ["marginMm", "Margin kertas (mm)"],
  ["gapXMm", "Jarak horizontal (mm)"],
  ["gapYMm", "Jarak vertikal (mm)"],
];

const FIELD_LABELS: [keyof PresetOptions["fields"], string][] = [
  ["eventName", "Nama event"],
  ["name", "Nama tamu"],
  ["group", "Grup"],
  ["code", "Kode tamu"],
];

/** Form ukuran & isi cetak (semua dalam mm). */
export function PrintSettings({ options: o, onChange }: Props) {
  const set = <K extends keyof PresetOptions>(key: K, value: PresetOptions[K]) => onChange({ ...o, [key]: value });
  const sheet = o.paper !== "LABEL";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-paper">Kertas</Label>
          <NativeSelect id="p-paper" value={o.paper} onChange={(e) => set("paper", e.target.value as PresetOptions["paper"])}>
            <option value="LABEL">1 label per halaman (printer label/gelang)</option>
            <option value="A4">A4</option>
            <option value="LETTER">Letter</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-orient">Orientasi</Label>
          <NativeSelect id="p-orient" value={o.orientation} disabled={!sheet} onChange={(e) => set("orientation", e.target.value as PresetOptions["orientation"])}>
            <option value="PORTRAIT">Potret</option>
            <option value="LANDSCAPE">Landscape</option>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-cols">Kolom</Label>
          <Input
            id="p-cols"
            type="number"
            min={1}
            max={30}
            placeholder="Otomatis"
            disabled={!sheet}
            value={o.columns ?? ""}
            onChange={(e) => set("columns", e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-theme">Tema</Label>
          <NativeSelect id="p-theme" value={o.theme} onChange={(e) => set("theme", e.target.value as PresetOptions["theme"])}>
            <option value="DARK">Gelang (desain asli)</option>
            <option value="LIGHT">Terang (putih)</option>
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {NUMBER_FIELDS.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`p-${key}`}>{label}</Label>
            <Input
              id={`p-${key}`}
              type="number"
              step="0.1"
              min={0}
              disabled={!sheet && (key === "marginMm" || key === "gapXMm" || key === "gapYMm")}
              value={o[key] as number}
              onChange={(e) => set(key, Number(e.target.value) as never)}
            />
          </div>
        ))}
      </div>

      {o.theme === "DARK" && (
        <p className="text-xs text-muted-foreground">
          Tema gelang memakai gambar desain asli; posisi & ukuran QR mengikuti desain (isian &quot;Ukuran QR&quot; diabaikan, nama event
          sudah ada di gambar). Pakai rasio 12,5 : 1, mis. 250 × 20 mm, agar gambar tidak gepeng.
        </p>
      )}

      <fieldset className="flex flex-wrap gap-4">
        <legend className="mb-1.5 text-sm font-medium">Informasi yang dicetak</legend>
        {FIELD_LABELS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={o.fields[key]}
              onChange={(e) => set("fields", { ...o.fields, [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}
