/**
 * PDF rendering utilities for PDF.js
 */
import { dpr as getDpr } from "../feature";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type * as PdfJsLib from "pdfjs-dist";

let _pdfjs: typeof PdfJsLib | null = null;
async function ensurePdfJs() {
  if (!_pdfjs) {
    _pdfjs = await import("pdfjs-dist");
  }
  return _pdfjs;
}

type PasswordHandler = (updatePassword: (password: string) => void, reason: number) => void;

export interface OpenPdfOptions {
  password?: string;
  onPassword?: PasswordHandler;
}

export async function openPdf(
  input: File | Blob | ArrayBuffer,
  options: OpenPdfOptions = {},
): Promise<PDFDocumentProxy> {
  if (typeof window === "undefined") {
    throw new Error("openPdf must be called in a browser environment");
  }
  const { getDocument } = await ensurePdfJs();
  const { initPdfJsWorker } = await import("./worker");
  initPdfJsWorker();

  const data = input instanceof ArrayBuffer ? input : await (input as Blob).arrayBuffer();
  const loadingTask = getDocument({ data, password: options.password });
  if (options.onPassword) {
    loadingTask.onPassword = options.onPassword;
  }
  const doc = await loadingTask.promise;
  return doc;
}

export interface RenderOptions {
  scale?: number;
  dpr?: number;
  background?: string;
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  cleanup: () => void;
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  options: RenderOptions = {},
): Promise<RenderResult> {
  const page = await doc.getPage(pageNumber);
  const scale = options.scale ?? 1;
  const viewport = page.getViewport({ scale });
  const dpr = options.dpr ?? getDpr();
  const canvas = document.createElement("canvas");
  const widthPx = Math.floor(viewport.width * dpr);
  const heightPx = Math.floor(viewport.height * dpr);
  canvas.width = widthPx;
  canvas.height = heightPx;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("2D canvas context not available");

  // Pre-fill with background color (defaults to white to avoid transparent JPEG artifacts)
  ctx.save();
  ctx.fillStyle = options.background ?? "#ffffff";
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.restore();

  const renderTask = (page as any).render({
    canvasContext: ctx as any,
    viewport,
    transform: [dpr, 0, 0, dpr, 0, 0],
  } as any);

  await renderTask.promise;

  const cleanup = () => {
    try {
      canvas.width = 0;
      canvas.height = 0;
    } catch {}
  };

  return { canvas, width: viewport.width, height: viewport.height, cleanup };
}

export function countPages(doc: PDFDocumentProxy): number {
  return doc.numPages;
}
