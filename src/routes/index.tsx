import React from "react";
import { FileArchive, FileDown } from "lucide-react";
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      {/* Page intro */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance] md:text-4xl">
          PDF to Image
        </h1>
        <p className="mt-2 text-slate-500">
          Convert PDF pages to JPEG, PNG, or WebP — entirely in your browser.
          Nothing is uploaded.
        </p>
      </div>

      {/* Drop zone */}
      <Dropzone
        onFiles={addFiles}
        disabled={!!busy}
        overlayText={busy ?? undefined}
        progress={busyProgress ?? undefined}
      />

      {/* Toolbar: stats + export actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {items.length}
            </span>{" "}
            {items.length === 1 ? "file" : "files"}
          </span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {totalSelected}
            </span>{" "}
            {totalSelected === 1 ? "page" : "pages"} selected
          </span>
          {message ? (
            <>
              <span className="text-slate-300" aria-hidden="true">|</span>
              <span
                className="text-slate-700"
                aria-live="polite"
                role="status"
              >
                {message}
              </span>
            </>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasSelection || !!busy}
            onClick={exportIndividually}
          >
            <FileDown size={16} aria-hidden="true" />
            Download pages
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasSelection || !!busy}
            onClick={exportAsZip}
          >
            <FileArchive size={16} aria-hidden="true" />
            Build ZIP
          </Button>
        </div>
      </div>

      {/* Conversion controls */}
      <section aria-labelledby="settings-heading" className="mt-6">
        <h2
          id="settings-heading"
          className="mb-3 text-sm font-semibold text-slate-700"
        >
          Conversion Settings
        </h2>
        <ControlsPanel
          format={format}
          onFormatChange={setFormat}
          scale={scale}
          onScaleChange={setScale}
          quality={quality}
          onQualityChange={setQuality}
        />
      </section>

      {/* File list */}
      {items.length > 0 && (
        <section aria-labelledby="files-heading" className="mt-8">
          <h2
            id="files-heading"
            className="mb-3 text-sm font-semibold text-slate-700"
          >
            Your PDF Files
          </h2>
          <FileList
            items={items}
            onTogglePage={togglePage}
            onSelectAll={selectAll}
            onClear={clearSel}
            onInvert={invertSel}
            onRemove={removeDoc}
          />
        </section>
      )}
    </main>
  );
}

export default App;
