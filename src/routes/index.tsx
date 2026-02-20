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
    <div className="mx-auto mb-8 max-w-[780px] relative bg-[#f8f6f0]">
      {/* Ruled lines */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent, transparent 30px, rgba(197,212,232,0.22) 30px, rgba(197,212,232,0.22) 31px)",
        }}
      />
      {/* Margin line */}
      <div className="absolute top-0 bottom-0 left-[72px] w-px bg-[rgba(232,196,196,0.5)] pointer-events-none z-0 hidden md:block" />
      {/* Hole punches */}
      <div
        className="absolute left-[28px] w-[18px] h-[18px] rounded-full bg-[#e8e4dc] border border-[#ccc] z-[2] hidden md:block"
        style={{ top: 80 }}
      />
      <div
        className="absolute left-[28px] w-[18px] h-[18px] rounded-full bg-[#e8e4dc] border border-[#ccc] z-[2] hidden md:block"
        style={{ top: "50%", transform: "translateY(-50%)" }}
      />
      <div
        className="absolute left-[28px] w-[18px] h-[18px] rounded-full bg-[#e8e4dc] border border-[#ccc] z-[2] hidden md:block"
        style={{ bottom: 80 }}
      />
      {/* PROOF stamp */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] font-special text-6xl uppercase tracking-[0.3em] text-[#b8312f] opacity-[0.02] border-[3px] border-[#b8312f] px-8 py-2 pointer-events-none z-[1] whitespace-nowrap select-none"
        aria-hidden="true"
      >
        PROOF
      </div>

      <main className="relative z-10 px-6 py-8 md:pl-20 md:pr-8 md:py-10">
        {/* Notice */}
        <p className="text-xs text-[#5a5750] mb-5">
          <span className="text-[#918c82]">[</span>NOTICE
          <span className="text-[#918c82]">]</span> All document processing
          occurs locally within your browser. No files are transmitted to any
          external server.
        </p>

        <p
          className="text-center text-[#918c82] text-xs tracking-[0.15em] select-none my-5"
          aria-hidden="true"
        >
          - - - - - - - - - - - - - - - - - - - - - - -
        </p>

        {/* Drop zone */}
        <div>
          <h2 className="font-special text-sm uppercase tracking-[0.2em] border-b-2 border-[#2c2a26] inline-block pb-0.5 mb-1 text-[#2c2a26]">
            Section A: Document Intake
          </h2>
          <p className="text-[10px] italic text-[#5a5750] mb-3">
            (Place documents face-down in the submission tray)
          </p>
          <Dropzone
            onFiles={addFiles}
            disabled={!!busy}
            overlayText={busy ?? undefined}
            progress={busyProgress ?? undefined}
          />
        </div>

        <p
          className="text-center text-[#918c82] text-xs tracking-[0.15em] select-none my-5"
          aria-hidden="true"
        >
          - - - - - - - - - - - - - - - - - - - - - - -
        </p>

        {/* Toolbar: stats + export actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-[#c5d4e8] bg-transparent px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 font-mono text-xs text-[#5a5750]">
            <span>
              <span className="font-semibold tabular-nums text-[#2c2a26]">
                {items.length}
              </span>{" "}
              {items.length === 1 ? "file" : "files"}
            </span>
            <span className="text-[#918c82]" aria-hidden="true">
              |
            </span>
            <span>
              <span className="font-semibold tabular-nums text-[#2c2a26]">
                {totalSelected}
              </span>{" "}
              {totalSelected === 1 ? "page" : "pages"} selected
            </span>
            {message ? (
              <>
                <span className="text-[#918c82]" aria-hidden="true">
                  |
                </span>
                <span
                  className="text-[#5a5750]"
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
              className="rounded-none"
              disabled={!hasSelection || !!busy}
              onClick={exportIndividually}
            >
              <FileDown size={16} aria-hidden="true" />
              Download pages
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-none"
              disabled={!hasSelection || !!busy}
              onClick={exportAsZip}
            >
              <FileArchive size={16} aria-hidden="true" />
              Build ZIP
            </Button>
          </div>
        </div>

        <p
          className="text-center text-[#918c82] text-xs tracking-[0.15em] select-none my-5"
          aria-hidden="true"
        >
          - - - - - - - - - - - - - - - - - - - - - - -
        </p>

        {/* Conversion controls */}
        <section aria-labelledby="settings-heading" className="mt-6">
          <h2
            id="settings-heading"
            className="font-special text-sm uppercase tracking-[0.2em] border-b-2 border-[#2c2a26] inline-block pb-0.5 mb-1 text-[#2c2a26]"
          >
            Section B: Conversion Parameters
          </h2>
          <p className="text-[10px] italic text-[#5a5750] mb-3">
            (Mark selections clearly. Use ☑ to indicate choice.)
          </p>
          <ControlsPanel
            format={format}
            onFormatChange={setFormat}
            scale={scale}
            onScaleChange={setScale}
            quality={quality}
            onQualityChange={setQuality}
          />
        </section>

        <p
          className="text-center text-[#918c82] text-xs tracking-[0.15em] select-none my-5"
          aria-hidden="true"
        >
          - - - - - - - - - - - - - - - - - - - - - - -
        </p>

        {/* File list */}
        {items.length > 0 && (
          <section aria-labelledby="files-heading" className="mt-8">
            <h2
              id="files-heading"
              className="font-special text-sm uppercase tracking-[0.2em] border-b-2 border-[#2c2a26] inline-block pb-0.5 mb-1 text-[#2c2a26]"
            >
              Section C: Document Manifest
            </h2>
            <p className="text-[10px] italic text-[#5a5750] mb-3">
              (Inventory of submitted documents and processing status)
            </p>
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

        {/* Footer */}
        <footer className="mt-8 pt-3 border-t-2 border-[#2c2a26] text-center text-[10px] text-[#918c82] tracking-widest uppercase leading-relaxed">
          Bureau of Document Conversion Services
          <br />
          Processed entirely within your browser — No data leaves this machine
          <br />
          <span className="tracking-[0.3em]">— END OF DOCUMENT —</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
