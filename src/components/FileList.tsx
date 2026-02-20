import React from "react";
import { ArrowDownUp, Eraser, MousePointerClick, Trash } from "lucide-react";

import PageThumbnail from "./PageThumbnail";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FileItem = {
  id: string;
  name: string;
  doc: PDFDocumentProxy;
  pageCount: number;
  selected: Set<number>;
};

type Props = {
  items: Array<FileItem>;
  onTogglePage: (docId: string, pageNumber: number) => void;
  onSelectAll: (docId: string) => void;
  onClear: (docId: string) => void;
  onInvert: (docId: string) => void;
  onRemove: (docId: string) => void;
  className?: string;
};

export default function FileList({
  items,
  onTogglePage,
  onSelectAll,
  onClear,
  onInvert,
  onRemove,
  className,
}: Props) {
  if (!items.length) return null;

  return (
    <section className={cn("flex flex-col gap-6", className)}>
      {items.map((item, index) => {
        const selectedCount = item.selected.size;
        const total = item.pageCount;
        const indexLabel = String(index + 1).padStart(3, "0");

        return (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <p
                className="select-none text-center font-mono text-xs tracking-[0.5em] text-[#918c82]"
                aria-hidden="true"
              >
                - - - - - -
              </p>
            )}
            <article className="border border-[#c5d4e8] bg-transparent">
              <header className="flex items-center justify-between gap-4 border-b border-[#2c2a26] bg-transparent px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate font-special text-[0.9rem] text-[#2c2a26]">
                    [{indexLabel}] {item.name}
                  </h3>
                  <p className="font-mono text-xs text-[#5a5750]">
                    ▸ {total} page{total === 1 ? "" : "s"}
                    {"  "}▸ {selectedCount} selected
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none border-[#918c82] text-[#5a5750] text-xs uppercase tracking-wider"
                    aria-label="Select all pages"
                    onClick={() => onSelectAll(item.id)}
                  >
                    <MousePointerClick size={16} aria-hidden="true" />
                    <span className="hidden md:inline">Select all</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none border-[#918c82] text-[#5a5750] text-xs uppercase tracking-wider"
                    aria-label="Clear selection"
                    onClick={() => onClear(item.id)}
                  >
                    <Eraser size={16} aria-hidden="true" />
                    <span className="hidden md:inline">Clear</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none border-[#918c82] text-[#5a5750] text-xs uppercase tracking-wider"
                    aria-label="Invert selection"
                    onClick={() => onInvert(item.id)}
                  >
                    <ArrowDownUp size={16} aria-hidden="true" />
                    <span className="hidden md:inline">Invert</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-[#b8312f] text-[#b8312f] text-xs uppercase tracking-wider"
                    size="sm"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash size={16} aria-hidden="true" />
                    <span className="hidden md:inline">Remove</span>
                  </Button>
                </div>
              </header>

              <div className="p-4">
                <div className="border border-dashed border-[#c5d4e8] bg-[#f8f6f0] p-3">
                  <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
                    {Array.from(
                      { length: item.pageCount },
                      (_, i) => i + 1,
                    ).map((page) => (
                      <PageThumbnail
                        key={page}
                        doc={item.doc}
                        pageNumber={page}
                        selected={item.selected.has(page)}
                        onToggle={(p) => onTogglePage(item.id, p)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </React.Fragment>
        );
      })}
    </section>
  );
}
