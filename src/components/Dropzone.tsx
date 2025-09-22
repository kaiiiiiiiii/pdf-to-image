import React from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: Array<File>) => void;
  className?: string;
  children?: React.ReactNode;
  textColor?: string;
  disabled?: boolean;
  overlayText?: React.ReactNode;
  progress?: number; // 0..1
};

export default function Dropzone({
  onFiles,
  className,
  children,
  textColor = "text-muted-foreground",
  disabled = false,
  overlayText,
  progress,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [hover, setHover] = React.useState(false);

  const handleFiles = React.useCallback(
    (list: FileList | null) => {
      if (!list) return;
      const files = Array.from(list).filter(
        (f) =>
          f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200",
        (dragOver || hover) && !disabled
          ? "border-primary/70 bg-secondary/30 ring-2 ring-primary/10"
          : "border-border bg-card/50",
        disabled && "opacity-80",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        className,
      )}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => !disabled && setHover(false)}
      onDragEnter={(e) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (disabled) return;
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => {
        if (disabled) return;
        if (inputRef.current) inputRef.current.value = ""; // allow re-selecting same file(s)
        inputRef.current?.click();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
      }}
      aria-label="Upload PDF files"
      aria-disabled={disabled || undefined}
      aria-busy={disabled || undefined}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          if (disabled) return;
          const files = e.currentTarget.files;
          handleFiles(files);
          // Reset the input so selecting the same file(s) again will fire change
          e.currentTarget.value = "";
        }}
      />
      <div className="pointer-events-none select-none relative z-10">
        {children ?? (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud
              className={cn(
                "h-7 w-7 transition-all duration-200",
                textColor,
                dragOver ? "text-primary" : "group-hover:text-foreground/80",
              )}
              aria-hidden="true"
            />
            <div className={cn("text-base font-medium", textColor)}>
              {dragOver
                ? "Release to upload"
                : "Drop PDFs here or click to browse"}
            </div>
            <div className={cn("text-xs", textColor)}>
              All processing happens locally in your browser
            </div>
          </div>
        )}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
          "bg-[radial-gradient(ellipse_at_top_left,theme(colors.primary/6),transparent_55%)]",
          dragOver ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Busy overlay */}
      {disabled ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-white/70 backdrop-blur-sm ring-1 ring-border">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className={cn("h-5 w-5 animate-spin text-slate-500")} />
            {overlayText ? (
              <div className="text-xs text-slate-600 px-3">{overlayText}</div>
            ) : null}
            {typeof progress === "number" ? (
              <div className="mt-1 h-1 w-40 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-slate-500/70 transition-[width] duration-200"
                  style={{
                    width: `${Math.max(0, Math.min(100, Math.round(progress * 100)))}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
