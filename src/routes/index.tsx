import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { FileItem } from "@/components/FileList";
import type { ImageFormat } from "@/lib/pdf/export";
import Dropzone from "@/components/Dropzone";
import FileList from "@/components/FileList";
import ControlsPanel from "@/components/ControlsPanel";
import { openPdf } from "@/lib/pdf/render";
import { exportPageAsImage } from "@/lib/pdf/export";
import { zipFiles } from "@/lib/zip";
import { downloadBlob, downloadMany } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { FileArchive, FileDown } from "lucide-react";

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

  // Robust ID generator that works across environments
  const generateId = React.useCallback(() => {
    try {
      // Prefer native UUID if available
      // @ts-ignore - crypto may be global in browser
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        // @ts-ignore
        return crypto.randomUUID();
      }
      // @ts-ignore
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
      ) {
        // RFC4122 v4
        // @ts-ignore
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
        return (
          hex.slice(0, 4).join("") +
          "-" +
          hex.slice(4, 6).join("") +
          "-" +
          hex.slice(6, 8).join("") +
          "-" +
          hex.slice(8, 10).join("") +
          "-" +
          hex.slice(10, 16).join("")
        );
      }
    } catch {}
    // Fallback: timestamp + random + counter
    const rand = Math.random().toString(36).slice(2);
    const ts = Date.now().toString(36);
    const perf = (typeof performance !== "undefined" ? performance.now() : 0)
      .toString(36)
      .replace(".", "");
    return `id_${ts}_${perf}_${rand}`;
  }, []);

  const addFiles = React.useCallback(
    async (files: Array<File>) => {
      if (!files?.length) return;
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
        let id = generateId();
        while (usedIds.has(id)) id = generateId();
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
    [generateId, items],
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <section className="relative overflow-hidden rounded-2xl mb-8 shadow-sm">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-sky-50 to-rose-50" />
          <div className="absolute -top-12 -left-16 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-rose-200/30 blur-3xl" />
          <div className="absolute inset-0 opacity-40 mix-blend-overlay [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
            <svg
              className="h-full w-full"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <defs>
                <pattern
                  id="dots"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r="0.8" fill="currentColor" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#dots)"
                className="text-sky-100"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 px-5 py-12 md:px-12 md:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600">
              PDF to Image
            </h1>
            <p className="mt-3 md:mt-4 text-base md:text-lg text-slate-600">
              Convert PDF pages to JPEG, PNG, or WEBP — privately in your
              browser.
            </p>

            {/* Dropzone inside hero */}
            <div className="mt-8 md:mt-10 max-w-xl mx-auto">
              <Dropzone
                onFiles={addFiles}
                textColor="text-slate-600"
                className="bg-white/70 backdrop-blur-sm border-slate-200 hover:bg-white/80 hover:border-slate-300 transition-colors shadow-sm"
                disabled={!!busy}
                overlayText={busy ?? undefined}
                progress={busyProgress ?? undefined}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm font-medium text-slate-700">
                    Drop PDFs here or click to upload
                  </div>
                  <div className="text-xs text-slate-500">
                    No files leave your device
                  </div>
                </div>
              </Dropzone>
            </div>

            {/* Quick hints */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 px-2.5 py-1">
                JPEG • PNG • WEBP
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 px-2.5 py-1">
                High-quality scaling
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/50 px-2.5 py-1">
                Works offline
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="sr-only">
          Conversion Settings
        </h2>
        <ControlsPanel
          className="mb-6"
          format={format}
          onFormatChange={setFormat}
          scale={scale}
          onScaleChange={setScale}
          quality={quality}
          onQualityChange={setQuality}
        />
      </section>

      <section aria-labelledby="files-heading">
        <h2 id="files-heading" className="sr-only">
          Your PDF Files
        </h2>
        <FileList
          className="mb-6"
          items={items}
          onTogglePage={togglePage}
          onSelectAll={selectAll}
          onClear={clearSel}
          onInvert={invertSel}
          onRemove={removeDoc}
        />
      </section>

      <footer className="sticky bottom-4 z-10" role="contentinfo">
        <div className="rounded-xl border bg-card/80 backdrop-blur px-4 py-3 shadow-sm">
          <div className="flex flex-row items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {busy ? (
                <span className="animate-pulse">{busy}</span>
              ) : (
                <span>
                  {items.length} file{items.length === 1 ? "" : "s"} loaded ·{" "}
                  {totalSelected} page
                  {totalSelected === 1 ? "" : "s"} selected
                </span>
              )}
              {message ? (
                <span className="ml-2 text-foreground">{message}</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={totalSelected === 0 || !!busy}
                onClick={exportIndividually}
              >
                <FileDown size={16} />
                Download <span className="hidden md:inline">individually</span>
              </Button>
              <Button
                type="button"
                variant="default"
                disabled={totalSelected === 0 || !!busy}
                onClick={exportAsZip}
              >
                <FileArchive size={16} />
                <span className="hidden md:inline">Download ZIP</span>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;
