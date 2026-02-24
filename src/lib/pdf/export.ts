import { supportsWebP } from "../feature";
import { renderPageToCanvas } from "./render";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ImageFormat = "png" | "jpeg" | "webp";

export interface ExportOptions {
  pageScale?: number; // 1..4 UI scale (multiplied by DPR in renderer)
  dpr?: number;
  background?: string;
  format: ImageFormat;
  quality?: number; // 0.0..1.0 (for jpeg/webp)
  baseName?: string;
}

export interface PageExportResult {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

export function mimeForFormat(format: ImageFormat): string {
  switch (format) {
    case "png":
      return "image/png";
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
  }
}

/**
 * If WEBP not supported (e.g., very old browsers), fallback to PNG or JPEG based on requested format.
 */
function effectiveFormat(requested: ImageFormat): ImageFormat {
  if (requested === "webp" && !supportsWebP()) return "png";
  return requested;
}

function extForFormat(fmt: ImageFormat): string {
  return fmt === "jpeg" ? "jpg" : fmt;
}

export function fileNameFor(base: string, pageNumber: number, format: ImageFormat): string {
  const safeBase = base.replace(/\.[^.]+$/, ""); // drop original extension
  return `${safeBase}-p${String(pageNumber).padStart(2, "0")}.${extForFormat(format)}`;
}

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  // Prefer promise-based createImageBitmap + convert if needed, but toBlob is fine and widely supported.
  return new Promise<Blob>((resolve, reject) => {
    // Some browsers ignore quality for PNG (as expected)
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode canvas to blob"));
        } else {
          resolve(blob);
        }
      },
      type,
      quality,
    );
  });
}

export async function exportPageAsImage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: ExportOptions,
): Promise<PageExportResult> {
  const fmt = effectiveFormat(options.format);
  const mime = mimeForFormat(fmt);
  const quality = typeof options.quality === "number" ? options.quality : 0.92;

  const { canvas, width, height, cleanup } = await renderPageToCanvas(doc, pageNumber, {
    scale: options.pageScale ?? 1,
    dpr: options.dpr,
    background: options.background,
  });

  try {
    const blob = await canvasToBlob(canvas, mime, quality);
    const fname = fileNameFor(options.baseName ?? "document", pageNumber, fmt);
    return { blob, filename: fname, width, height };
  } finally {
    cleanup();
  }
}
