"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiUpload } from "@/lib/api";
import { Alert, AlertDescription } from "@/views/components/ui/alert";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { ImportMapping } from "./ImportMapping";
import { ImportPreview } from "./ImportPreview";
import { ImportHistory } from "./ImportHistory";
import type { BatchItem, ColumnMapping, ImportSummary, PreviewData } from "./types";

type CommitResult = { batch: { successRows: number; totalRows: number }; summary: ImportSummary };

export function ImportIndex({ eventName, batches }: { eventName: string; batches: BatchItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function formFor(f: File, sheet?: string, mapping?: ColumnMapping) {
    const fd = new FormData();
    fd.append("file", f);
    if (sheet) fd.append("sheet", sheet);
    if (mapping) fd.append("mapping", JSON.stringify(mapping));
    return fd;
  }

  async function runPreview(f: File, sheet?: string, mapping?: ColumnMapping) {
    setBusy(true);
    setError(null);
    const res = await apiUpload<PreviewData>("/api/imports/preview", formFor(f, sheet, mapping));
    setBusy(false);
    if (!res.ok) {
      setPreview(null);
      setError(res.error);
      return;
    }
    setPreview(res.data);
  }

  async function commit() {
    if (!file || !preview) return;
    setBusy(true);
    const res = await apiUpload<CommitResult>("/api/imports/commit", formFor(file, preview.sheet, preview.mapping));
    setBusy(false);
    if (!res.ok) return toast.error(res.error);
    const { successRows, totalRows } = res.data.batch;
    toast.success(`${successRows} dari ${totalRows} baris tersimpan`);
    reset();
    router.refresh();
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canCommit = !!preview && preview.missing.length === 0 && preview.summary.valid > 0 && !busy;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impor Data</h1>
        <p className="text-sm text-muted-foreground">
          Tujuan: <span className="font-medium text-foreground">{eventName}</span> (ganti event di bagian atas). File .xlsx atau .csv, maks. 5 MB.
          Kolom wajib: Nama dan Grup (ENTITAS juga dikenali sebagai Grup). Kode tamu 0001, 0002, … dibuat otomatis.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          className="max-w-sm"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) runPreview(f);
            else reset();
          }}
        />
        {file && (
          <Button variant="outline" onClick={reset} disabled={busy}>
            Batal
          </Button>
        )}
        {busy && <span className="text-sm text-muted-foreground">Memproses…</span>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {preview && file && (
        <div className="space-y-4">
          <ImportMapping
            preview={preview}
            disabled={busy}
            onSheet={(sheet) => runPreview(file, sheet)}
            onMapping={(mapping) => runPreview(file, preview.sheet, mapping)}
          />
          {preview.missing.length > 0 ? (
            <Alert variant="destructive">
              <AlertDescription>Petakan kolom wajib: {preview.missing.join(", ")}</AlertDescription>
            </Alert>
          ) : (
            <ImportPreview preview={preview} />
          )}
          <div className="flex items-center gap-3">
            <Button onClick={commit} disabled={!canCommit}>
              Simpan {preview.summary.valid.toLocaleString("id-ID")} tamu
            </Button>
            {preview.summary.valid === 0 && preview.missing.length === 0 && (
              <span className="text-sm text-muted-foreground">Tidak ada baris baru yang valid.</span>
            )}
          </div>
        </div>
      )}

      <ImportHistory batches={batches} />
    </div>
  );
}
