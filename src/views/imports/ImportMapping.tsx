"use client";

import { FIELD_LABELS, IMPORT_FIELDS, REQUIRED_FIELDS, type ImportField } from "@/Services/Import/validateImport";
import { Label } from "@/views/components/ui/label";
import { NativeSelect } from "@/views/components/NativeSelect";
import type { ColumnMapping, PreviewData } from "./types";

type Props = {
  preview: PreviewData;
  disabled: boolean;
  onSheet: (sheet: string) => void;
  onMapping: (mapping: ColumnMapping) => void;
};

/** Pilihan sheet + pemetaan kolom sumber -> kolom sistem. */
export function ImportMapping({ preview, disabled, onSheet, onMapping }: Props) {
  function setField(field: ImportField, value: string) {
    const next = { ...preview.mapping };
    if (value === "") delete next[field];
    else next[field] = Number(value);
    onMapping(next);
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-5">
      <div className="space-y-1.5">
        <Label htmlFor="imp-sheet">Sheet</Label>
        <NativeSelect id="imp-sheet" value={preview.sheet} disabled={disabled} onChange={(e) => onSheet(e.target.value)}>
          {preview.sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">Header di baris {preview.headerRow}</p>
      </div>
      {IMPORT_FIELDS.map((field) => (
        <div key={field} className="space-y-1.5">
          <Label htmlFor={`imp-${field}`}>
            {FIELD_LABELS[field]}
            {REQUIRED_FIELDS.includes(field) && <span className="text-destructive"> *</span>}
          </Label>
          <NativeSelect
            id={`imp-${field}`}
            value={preview.mapping[field] ?? ""}
            disabled={disabled}
            onChange={(e) => setField(field, e.target.value)}
          >
            <option value="">— tidak dipakai —</option>
            {preview.headers.map((h, i) => (
              <option key={i} value={i}>
                {h || `Kolom ${i + 1}`}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
    </div>
  );
}
