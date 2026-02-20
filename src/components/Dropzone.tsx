import React from "react";
import { Loader2 } from "lucide-react";
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
  textColor: _textColor = "text-muted-foreground",
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
        "group relative overflow-hidden border-2 border-dashed border-[#918c82] bg-transparent p-6 text-center transition-colors duration-200",
        (dragOver || hover) && !disabled && "border-[#2c2a26] bg-[#f0ede5]",
        disabled && "opacity-80",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-[#918c82]",
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
          <div className="flex flex-col items-center gap-3">
            <span
              className="block text-2xl text-[#5a5750]"
              aria-hidden="true"
            >
              📎
            </span>
            <div className="font-special text-base text-[#2c2a26] tracking-wide">
              {dragOver
                ? "[ RELEASE TO UPLOAD ]"
                : "[ DROP PDF FILES HERE ]"}
            </div>
            <div className="text-xs text-[#5a5750]">
              -- or click to open file selector --
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-[#918c82]">
              AUTHORIZED FILE TYPES: .pdf only | All processing happens locally
              in your browser
            </div>
          </div>
        )}
      </div>

      {/* Busy overlay */}
      {disabled ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#f8f6f0]/80">
          <div className="flex flex-col items-center gap-2 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#918c82]" />
            {overlayText ? (
              <div className="text-xs text-[#5a5750] px-3">{overlayText}</div>
            ) : null}
            {typeof progress === "number" ? (
              <div className="mt-1 h-px w-40 bg-[#c5d4e8] overflow-hidden">
                <div
                  className="h-full bg-[#2c2a26] transition-[width] duration-200"
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
