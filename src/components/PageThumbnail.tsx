import React from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "@/lib/pdf/render";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
export default function PageThumbnail({ doc, pageNumber, selected, onToggle }: Props) {
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
        if (!cancelled) {
          const dataUrl = result.canvas.toDataURL("image/jpeg", 0.8);
          setSrc(dataUrl);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Failed to render";
          setError(msg);
        }
      } finally {
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
    <Button
      type="button"
      variant="outline"
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card hover:shadow-sm transition-shadow focus:outline-none focus:ring h-48 xl:h-56 w-36 xl:w-42",
        selected ? "ring-2 ring-primary" : "",
      )}
      onClick={() => onToggle(pageNumber)}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}${selected ? " selected" : ""}`}
      asChild
    >
      <div>
        <div className="bg-muted grid place-items-center xl:p-px">
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
          {!loading && !error && src && (
            <img
              src={src}
              alt={`Page ${pageNumber}`}
              className="block w-full h-auto object-contain"
              decoding="async"
              loading="lazy"
            />
          )}
        </div>
        <div
          className={cn(
            "absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
            selected
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {pageNumber}
        </div>
        <div className="absolute bottom-2 right-2">
          <Checkbox className="h-4 w-4 accent-primary" checked={selected} aria-hidden="true" />
        </div>
      </div>
    </Button>
  );
}
