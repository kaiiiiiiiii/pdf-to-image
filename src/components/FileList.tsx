import { ArrowDownUp, Eraser, MousePointerClick, Trash } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import PageThumbnail from "./PageThumbnail";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
      {items.map((item) => {
        const selectedCount = item.selected.size;
        const total = item.pageCount;

        return (
          <article key={item.id} className="rounded-xl border bg-card">
            <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{item.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedCount} / {total} pages selected
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
                <Button type="button" variant="outline" size="sm" onClick={() => onClear(item.id)}>
                  <Eraser size={16} />
                  <span className="hidden md:inline">Clear</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => onInvert(item.id)}>
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
              <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6">
                {Array.from({ length: item.pageCount }, (_, i) => i + 1).map((page) => (
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
          </article>
        );
      })}
    </section>
  );
}
