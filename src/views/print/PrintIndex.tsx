"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiSend } from "@/lib/api";
import { BUILTIN_PRESETS, type PresetOptions } from "@/config/printPresets";
import { Button } from "@/views/components/ui/button";
import { Input } from "@/views/components/ui/input";
import { Label } from "@/views/components/ui/label";
import { NativeSelect } from "@/views/components/NativeSelect";
import { PrintSettings } from "./PrintSettings";
import { QrSummaryCard, type QrSummary } from "./QrSummaryCard";

type SavedPreset = { id: number; name: string; options: PresetOptions };
type Selection = { scope: "all" } | { scope: "group"; group: string } | { scope: "codes"; codes: string };
type Props = { eventName: string; summary: QrSummary; groups: string[]; saved: SavedPreset[] };

/** POST /api/print/pdf -> Blob PDF, atau pesan galat. */
async function fetchPdf(selection: Selection, options: PresetOptions, preview: boolean) {
  try {
    const res = await fetch("/api/print/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection, options, preview }),
    });
    if (!res.ok) return { error: ((await res.json().catch(() => ({}))).error as string) ?? `Gagal (${res.status})` };
    return {
      blob: await res.blob(),
      count: Number(res.headers.get("X-Label-Count")),
      skipped: Number(res.headers.get("X-Skipped-No-Qr")),
    };
  } catch {
    return { error: "Gagal terhubung ke server" };
  }
}

export function PrintIndex({ eventName, summary, groups, saved }: Props) {
  const router = useRouter();
  const [presetKey, setPresetKey] = useState(`b:${BUILTIN_PRESETS[0].key}`);
  const [options, setOptions] = useState<PresetOptions>(BUILTIN_PRESETS[0].options);
  const [scope, setScope] = useState<Selection["scope"]>("all");
  const [group, setGroup] = useState(groups[0] ?? "");
  const [codes, setCodes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  const selection: Selection = scope === "group" ? { scope, group } : scope === "codes" ? { scope, codes } : { scope };

  function choosePreset(key: string) {
    setPresetKey(key);
    const found = key.startsWith("b:")
      ? BUILTIN_PRESETS.find((p) => `b:${p.key}` === key)?.options
      : saved.find((p) => `s:${p.id}` === key)?.options;
    if (found) setOptions(found);
  }

  async function run(preview: boolean) {
    setBusy(true);
    const r = await fetchPdf(selection, options, preview);
    setBusy(false);
    if ("error" in r) return toast.error(r.error);
    const skipped = r.skipped ? ` · ${r.skipped} tamu dilewati (belum punya QR)` : "";
    setInfo(`${r.count.toLocaleString("id-ID")} label${skipped}`);
    const url = URL.createObjectURL(r.blob!);
    if (preview) {
      setPreviewUrl(url);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${eventName.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }

  async function savePreset() {
    const current = saved.find((p) => `s:${p.id}` === presetKey)?.name ?? "";
    const name = prompt("Nama preset (nama sama = ditimpa):", current)?.trim();
    if (!name) return;
    const res = await apiSend<{ id: number }>("/api/print-presets", "POST", { name, options });
    if (!res.ok) return toast.error(res.error);
    toast.success(`Preset "${name}" disimpan`);
    setPresetKey(`s:${res.data.id}`);
    router.refresh();
  }

  async function deletePreset() {
    const p = saved.find((x) => `s:${x.id}` === presetKey);
    if (!p || !confirm(`Hapus preset "${p.name}"?`)) return;
    const res = await apiSend(`/api/print-presets/${p.id}`, "DELETE");
    if (!res.ok) return toast.error(res.error);
    toast.success("Preset dihapus");
    choosePreset(`b:${BUILTIN_PRESETS[0].key}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">QR & Cetak</h1>
        <p className="text-sm text-muted-foreground">Event: {eventName}. QR berisi token acak; kode tamu hanya dicetak sebagai teks.</p>
      </div>

      <QrSummaryCard summary={summary} />

      <section className="space-y-4 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Cetak</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-scope">Tamu</Label>
            <NativeSelect id="p-scope" value={scope} onChange={(e) => setScope(e.target.value as Selection["scope"])}>
              <option value="all">Semua tamu aktif</option>
              <option value="group">Per grup</option>
              <option value="codes">Kode tertentu / rentang</option>
            </NativeSelect>
          </div>
          {scope === "group" && (
            <div className="space-y-1.5">
              <Label htmlFor="p-group">Grup</Label>
              <NativeSelect id="p-group" value={group} onChange={(e) => setGroup(e.target.value)}>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          {scope === "codes" && (
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="p-codes">Kode</Label>
              <Input id="p-codes" placeholder="0001-0100, 0150, 0743-0840" value={codes} onChange={(e) => setCodes(e.target.value)} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-72 space-y-1.5">
            <Label htmlFor="p-preset">Preset</Label>
            <NativeSelect id="p-preset" value={presetKey} onChange={(e) => choosePreset(e.target.value)}>
              <optgroup label="Bawaan">
                {BUILTIN_PRESETS.map((p) => (
                  <option key={p.key} value={`b:${p.key}`}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
              {saved.length > 0 && (
                <optgroup label="Tersimpan">
                  {saved.map((p) => (
                    <option key={p.id} value={`s:${p.id}`}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </NativeSelect>
          </div>
          <Button variant="outline" onClick={savePreset}>
            Simpan sebagai preset
          </Button>
          {presetKey.startsWith("s:") && (
            <Button variant="outline" onClick={deletePreset}>
              Hapus preset
            </Button>
          )}
        </div>

        <PrintSettings options={options} onChange={setOptions} />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => run(true)} disabled={busy}>
            Pratinjau halaman 1
          </Button>
          <Button onClick={() => run(false)} disabled={busy}>
            {busy ? "Memproses…" : "Unduh PDF"}
          </Button>
          {info && <span className="text-sm text-muted-foreground">{info}</span>}
        </div>

        {previewUrl && (
          <iframe title="Pratinjau cetak" src={previewUrl} className="h-[480px] w-full rounded-lg border bg-muted" />
        )}
      </section>
    </div>
  );
}
