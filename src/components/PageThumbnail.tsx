import React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "@/lib/pdf/render";
import { cn } from "@/lib/utils";

type Props = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  selected: boolean;
  onToggle: (pageNumber: number) => void;
  thumbWidth?: number;
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(m.matches);
    m.addEventListener("change", listener);
    return () => m.removeEventListener("change", listener);
  }, [query]);
  return matches;
}
export default function PageThumbnail({
  doc,
  pageNumber,
  selected,
  onToggle,
}: Props) {
  const [src, setSrc] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const isXL = useMediaQuery("(min-width: 1280px)");
  const thumbWidth = 160;
  const targetWidth = isXL ? Math.round(thumbWidth * 1.125) : thumbWidth;

  React.useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const page = await doc.getPage(pageNumber);
        const vp = page.getViewport({ scale: 1 });
        const scale = Math.max(targetWidth / vp.width, 0.1);
        const result = await renderPageToCanvas(doc, pageNumber, {
          scale,
          background: "#ffffff",
        });
        cleanup = result.cleanup;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) {
          const dataUrl = result.canvas.toDataURL("image/jpeg", 0.8);
          setSrc(dataUrl);
        }
      } catch (e: any) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) setError(e?.message ?? "Failed to render");
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!cancelled) setLoading(false);
        // Let React paint first, then cleanup the canvas memory
        requestAnimationFrame(() => cleanup?.());
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [doc, pageNumber, targetWidth]);

  return (
    <button
      type="button"
      className={cn(
        "relative h-48 w-36 overflow-hidden rounded-xl border bg-white transition-[border-color,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 xl:h-56 xl:w-42",
        selected
          ? "border-primary/50 ring-2 ring-primary/40"
          : "border-slate-200 hover:border-slate-300",
      )}
      onClick={() => onToggle(pageNumber)}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}${selected ? ", selected" : ""}`}
    >
      <div className="grid h-full place-items-center bg-slate-50">
        {loading && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
        {!loading && !error && src && (
          <img
            src={src}
            alt={`Page ${pageNumber}`}
            width={targetWidth}
            height={Math.round(targetWidth * 1.414)}
            className="block h-auto w-full object-contain"
            decoding="async"
            loading="lazy"
          />
        )}
      </div>
      {/* Page number badge */}
      <div
        className={cn(
          "absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-slate-900/70 text-white",
        )}
        aria-hidden="true"
      >
        {pageNumber}
      </div>
      {/* Selected indicator */}
      <div
        className={cn(
          "absolute bottom-2 right-2 h-4 w-4 rounded-sm border-2 transition-colors",
          selected
            ? "border-primary bg-primary"
            : "border-slate-300 bg-white",
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg
            viewBox="0 0 10 10"
            className="h-full w-full text-primary-foreground"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="2,5 4,7.5 8,2.5" />
          </svg>
        )}
      </div>
    </button>
  );
}
