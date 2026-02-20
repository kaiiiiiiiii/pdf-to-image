import React from "react";
import {
  FileArchive,
  FileDown,
  Gauge,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import type { FileItem } from "@/components/FileList";
import type { ImageFormat } from "@/lib/pdf/export";
import ControlsPanel from "@/components/ControlsPanel";
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import { Button } from "@/components/ui/button";
import { downloadBlob, downloadMany } from "@/lib/download";
import { exportPageAsImage } from "@/lib/pdf/export";
import { openPdf } from "@/lib/pdf/render";
import { makeClientId } from "@/lib/utils";
import { zipFiles } from "@/lib/zip";

export const Route = createFileRoute("/")({
  component: App,
});

type AppFileItem = FileItem;

function App() {
  const [items, setItems] = React.useState<Array<AppFileItem>>([]);
  const [format, setFormat] = React.useState<ImageFormat>("jpeg");
  const [scale, setScale] = React.useState<number>(2);
  const [quality, setQuality] = React.useState<number>(0.95);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [busyProgress, setBusyProgress] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const addFiles = React.useCallback(
    async (files: Array<File>) => {
      if (!files.length) return;
      setMessage(null);
      setBusy("Importing PDFs…");
      setBusyProgress(0);
      const total = files.length;
      let processed = 0;
      const newItems: Array<AppFileItem> = [];
      // Ensure IDs are unique across current and newly added items
      const usedIds = new Set<string>(items.map((i) => i.id));
      // Ensure names are unique for display/download clarity
      const usedNames = new Set<string>(items.map((i) => i.name));
      const nextUniqueId = () => {
        let id = makeClientId();
        while (usedIds.has(id)) id = makeClientId();
        usedIds.add(id);
        return id;
      };
      const nextUniqueName = (original: string) => {
        if (!usedNames.has(original)) {
          usedNames.add(original);
          return original;
        }
        const match = original.match(/^(.*?)(\.[^.]+)?$/);
        const base = match?.[1] ?? original;
        const ext = match?.[2] ?? "";
        let n = 2;
        let candidate = `${base} (${n})${ext}`;
        while (usedNames.has(candidate)) {
          n += 1;
          candidate = `${base} (${n})${ext}`;
        }
        usedNames.add(candidate);
        return candidate;
      };
      for (const file of files) {
        try {
          const baseName = file.name;
          const displayName = nextUniqueName(baseName);
          const doc = await openPdf(file, {
            onPassword(updatePassword, reason) {
              // 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
              const promptText =
                reason === 1
                  ? `Enter password for ${baseName}`
                  : `Incorrect password. Try again for ${baseName}`;
              const pw = window.prompt(promptText) || "";
              updatePassword(pw);
            },
          });
          const pageCount = doc.numPages;
          const selected = new Set<number>(
            Array.from({ length: pageCount }, (_, i) => i + 1),
          ); // default select all
          newItems.push({
            id: nextUniqueId(),
            name: displayName,
            doc,
            pageCount,
            selected,
          });
          processed += 1;
          setBusy(`Importing PDFs… ${processed}/${total}`);
          setBusyProgress(processed / total);
        } catch (e: any) {
          console.error("Failed to open PDF", e);
          setMessage(`Failed to open ${file.name}: ${e?.message ?? e}`);
          // Count failures as processed to keep progress moving
          processed += 1;
          setBusy(`Importing PDFs… ${processed}/${total}`);
          setBusyProgress(processed / total);
        }
      }
      if (newItems.length) {
        setItems((prev) => [...prev, ...newItems]);
      }
      setBusy(null);
      setBusyProgress(null);
    },
    [items],
  );

  const togglePage = React.useCallback((docId: string, pageNumber: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== docId) return it;
        const next = new Set(it.selected);
        if (next.has(pageNumber)) next.delete(pageNumber);
        else next.add(pageNumber);
        return { ...it, selected: next };
      }),
    );
  }, []);

  const selectAll = React.useCallback((docId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== docId) return it;
        return {
          ...it,
          selected: new Set(
            Array.from({ length: it.pageCount }, (_, i) => i + 1),
          ),
        };
      }),
    );
  }, []);

  const clearSel = React.useCallback((docId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== docId) return it;
        return { ...it, selected: new Set() };
      }),
    );
  }, []);

  const invertSel = React.useCallback((docId: string) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== docId) return it;
        const next = new Set<number>();
        for (let p = 1; p <= it.pageCount; p++) {
          if (!it.selected.has(p)) next.add(p);
        }
        return { ...it, selected: next };
      }),
    );
  }, []);

  const removeDoc = React.useCallback((docId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== docId));
  }, []);

  const totalSelected = React.useMemo(
    () => items.reduce((acc, it) => acc + it.selected.size, 0),
    [items],
  );

  const hasSelection = totalSelected > 0;

  const exportIndividually = React.useCallback(async () => {
    if (!items.length) return;
    setMessage(null);
    // compute total pages
    const totalPages = items.reduce((acc, it) => acc + it.selected.size, 0);
    if (!totalPages) {
      setMessage("No pages selected.");
      return;
    }
    setBusy("Exporting images…");
    setBusyProgress(0);
    try {
      const downloads: Array<{ blob: Blob; filename: string }> = [];
      let done = 0;
      for (const it of items) {
        if (!it.selected.size) continue;
        const pages = Array.from(it.selected).sort((a, b) => a - b);
        for (const p of pages) {
          const res = await exportPageAsImage(it.doc, p, {
            format,
            pageScale: scale,
            quality,
            baseName: it.name,
            dpr: undefined,
            background: "#ffffff",
          });
          downloads.push({ blob: res.blob, filename: res.filename });
          done += 1;
          setBusy(`Exporting images… ${done}/${totalPages}`);
          setBusyProgress(done / totalPages);
        }
      }
      await downloadMany(downloads);
      setMessage(
        `Downloaded ${downloads.length} image${downloads.length === 1 ? "" : "s"}.`,
      );
    } catch (e: any) {
      console.error(e);
      setMessage(`Export failed: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
      setBusyProgress(null);
    }
  }, [items, format, scale, quality]);

  const exportAsZip = React.useCallback(async () => {
    if (!items.length) return;
    setMessage(null);
    const totalPages = items.reduce((acc, it) => acc + it.selected.size, 0);
    if (!totalPages) {
      setMessage("No pages selected.");
      return;
    }
    setBusy("Creating ZIP…");
    setBusyProgress(0);
    try {
      const entries: Array<{ path: string; data: Blob }> = [];
      let done = 0;
      for (const it of items) {
        if (!it.selected.size) continue;
        const safeBase = it.name.replace(/\.[^.]+$/, "");
        const pages = Array.from(it.selected).sort((a, b) => a - b);
        for (const p of pages) {
          const res = await exportPageAsImage(it.doc, p, {
            format,
            pageScale: scale,
            quality,
            baseName: safeBase,
            dpr: undefined,
            background: "#ffffff",
          });
          entries.push({ path: `${safeBase}/${res.filename}`, data: res.blob });
          done += 1;
          setBusy(`Creating ZIP… ${done}/${totalPages}`);
          setBusyProgress(done / totalPages);
        }
      }
      const zip = await zipFiles(entries, { level: 6 });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadBlob(zip, `export-${stamp}.zip`);
      setMessage(
        `ZIP created with ${entries.length} image${entries.length === 1 ? "" : "s"}.`,
      );
    } catch (e: any) {
      console.error(e);
      setMessage(`ZIP export failed: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
      setBusyProgress(null);
    }
  }, [items, format, scale, quality]);

  const statusLine = busy
    ? busy
    : `${items.length} file${items.length === 1 ? "" : "s"} loaded · ${totalSelected} page${
        totalSelected === 1 ? "" : "s"
      } selected`;

  return (
    <main className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.14),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(236,72,153,0.12),transparent_35%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.01)_35%,transparent_55%)]" />

      <section className="relative overflow-hidden rounded-3xl border bg-white/85 shadow-lg backdrop-blur">
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50" />
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-14 -bottom-10 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative grid gap-10 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Private by default
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                <Sparkles className="h-4 w-4" />
                Redesigned workspace
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-5xl">
                Browser-native PDF to image studio
              </h1>
              <p className="max-w-2xl text-base text-slate-600 md:text-lg">
                Collect PDFs, tune output quality, and export pages without
                uploading anything. Everything renders locally with the updated
                console.
              </p>
            </div>

            <div className="rounded-2xl border bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">
                    Drop your PDFs
                  </p>
                  <p className="text-sm text-slate-600">
                    Drag in multiple documents or tap to browse. We keep each
                    file isolated so you can cherry-pick pages to export.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    JPEG · PNG · WEBP
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    High-DPI aware
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    ZIP-ready
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Dropzone
                  onFiles={addFiles}
                  textColor="text-slate-600"
                  className="bg-gradient-to-br from-slate-50 via-white to-slate-100 border-slate-200 hover:border-slate-300 transition-all shadow-[0_10px_50px_-45px_rgba(15,23,42,0.65)]"
                  disabled={!!busy}
                  overlayText={busy ?? undefined}
                  progress={busyProgress ?? undefined}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col items-start gap-1 text-left">
                      <div className="text-sm font-semibold text-slate-800">
                        Drop PDFs here or click to upload
                      </div>
                      <div className="text-xs text-slate-500">
                        No servers, no waiting — everything stays on this
                        device.
                      </div>
                    </div>
                    <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                      {busy ? "Working…" : "Ready"}
                    </div>
                  </div>
                </Dropzone>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Loaded PDFs" value={`${items.length}`} />
              <StatCard
                label="Pages selected"
                value={`${totalSelected}`}
                hint="Toggle pages directly from the grid."
              />
              <StatCard
                label="Current output"
                value={`${format.toUpperCase()} • ${scale.toFixed(1)}x`}
                hint={
                  format === "jpeg" || format === "webp"
                    ? `Quality ${(quality * 100).toFixed(0)}%`
                    : "Lossless export"
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Workspace status</p>
                  <p className="text-lg font-semibold">
                    {busy ?? "Ready to export"}
                  </p>
                  {message ? (
                    <p className="mt-1 text-sm text-emerald-200">{message}</p>
                  ) : null}
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                  {items.length ? "Session active" : "Awaiting files"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="bg-white text-slate-900 hover:bg-slate-100"
                  disabled={!hasSelection || !!busy}
                  onClick={exportIndividually}
                >
                  <FileDown size={16} />
                  Download pages
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                  disabled={!hasSelection || !!busy}
                  onClick={exportAsZip}
                >
                  <FileArchive size={16} />
                  Build ZIP
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-xs text-slate-200">
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Files
                  </p>
                  <p className="text-base font-semibold">{items.length}</p>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Selected
                  </p>
                  <p className="text-base font-semibold">{totalSelected}</p>
                </div>
                <div className="rounded-xl bg-white/5 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    Format
                  </p>
                  <p className="text-base font-semibold">
                    {format.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <Wand2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Flow at a glance</p>
                  <p className="text-xs text-slate-500">
                    Quick steps for the refreshed console.
                  </p>
                </div>
              </div>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1) Import PDFs with the drop area.</li>
                <li>2) Select pages and tune quality + scale.</li>
                <li>3) Export pages directly or as a ZIP bundle.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-heading" className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Conversion controls
            </p>
            <p className="text-sm text-slate-500">
              Dial in quality, scale, and formats before exporting.
            </p>
          </div>
          <div className="hidden rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600 md:inline-flex">
            <Gauge className="mr-2 h-4 w-4 text-primary" />
            Live previews on every change.
          </div>
        </div>
        <h2 id="settings-heading" className="sr-only">
          Conversion Settings
        </h2>
        <ControlsPanel
          className="border-0 bg-white/80 shadow-sm ring-1 ring-slate-100"
          format={format}
          onFormatChange={setFormat}
          scale={scale}
          onScaleChange={setScale}
          quality={quality}
          onQualityChange={setQuality}
        />
      </section>

      <section aria-labelledby="files-heading" className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Your PDF files
            </p>
            <p className="text-sm text-slate-500">
              Tap any page to include or exclude it from the export.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {items.length ? `${items.length} open` : "Waiting for files"}
          </div>
        </div>
        <h2 id="files-heading" className="sr-only">
          Your PDF Files
        </h2>
        <FileList
          className="mb-2"
          items={items}
          onTogglePage={togglePage}
          onSelectAll={selectAll}
          onClear={clearSel}
          onInvert={invertSel}
          onRemove={removeDoc}
        />
      </section>

      <footer
        className="mt-8 rounded-2xl border bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-sm backdrop-blur"
        role="contentinfo"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
              {hasSelection ? "Selection ready" : "No pages selected"}
            </span>
            <span className="text-muted-foreground">{statusLine}</span>
          </div>
          {message ? (
            <span className="text-foreground">{message}</span>
          ) : null}
        </div>
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default App;
