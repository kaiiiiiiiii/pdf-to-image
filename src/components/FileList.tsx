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
    <section className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => {
        const selectedCount = item.selected.size;
        const total = item.pageCount;

        return (
          <article
            key={item.id}
            className="rounded-2xl border bg-white/80 shadow-sm ring-1 ring-slate-100"
          >
            <header className="flex items-center justify-between gap-4 border-b bg-gradient-to-r from-slate-50 to-white px-4 py-3">
              <div className="min-w-0 space-y-1">
                <h3 className="truncate text-base font-semibold text-slate-900">
                  {item.name}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {total} page{total === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    {selectedCount} selected
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectAll(item.id)}
                >
                  <MousePointerClick size={16} />
                  <span className="hidden md:inline">Select all</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onClear(item.id)}
                >
                  <Eraser size={16} />
                  <span className="hidden md:inline">Clear</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onInvert(item.id)}
                >
                  <ArrowDownUp size={16} />
                  <span className="hidden md:inline">Invert</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                  size="sm"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  title="Remove"
                >
                  <Trash size={16} />
                  <span className="hidden md:inline">Remove</span>
                </Button>
              </div>
            </header>

            <div className="p-4">
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3">
                <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
                  {Array.from({ length: item.pageCount }, (_, i) => i + 1).map(
                    (page) => (
                      <PageThumbnail
                        key={page}
                        doc={item.doc}
                        pageNumber={page}
                        selected={item.selected.has(page)}
                        onToggle={(p) => onTogglePage(item.id, p)}
                      />
                    ),
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
