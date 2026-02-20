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
        "relative h-48 w-36 overflow-hidden border bg-[#f8f6f0] transition-[border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c2a26]/60 xl:h-56 xl:w-42",
        selected
          ? "border-2 border-[#2c2a26]"
          : "border-[#c5d4e8] hover:border-[#918c82]",
      )}
      onClick={() => onToggle(pageNumber)}
      aria-pressed={selected}
      aria-label={`Page ${pageNumber}${selected ? ", selected" : ""}`}
    >
      <div className="grid h-full place-items-center bg-[#f8f6f0]">
        {loading && (
          <span className="text-xs text-[#918c82]">Loading…</span>
        )}
        {error && <span className="text-xs text-[#b8312f]">{error}</span>}
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
          "absolute left-2 top-2 px-1.5 py-0.5 text-[11px] font-mono",
          selected
            ? "bg-[#2c2a26] text-[#f8f6f0]"
            : "bg-[#918c82] text-[#f8f6f0]",
        )}
        aria-hidden="true"
      >
        {pageNumber}
      </div>
      {/* Selection indicator */}
      <span
        className={cn(
          "absolute bottom-1.5 right-1.5 text-base leading-none",
          selected ? "text-[#2c2a26]" : "text-[#918c82]",
        )}
        aria-hidden="true"
      >
        {selected ? "☑" : "☐"}
      </span>
    </button>
  );
}
