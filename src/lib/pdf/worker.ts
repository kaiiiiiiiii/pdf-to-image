/**
 * PDF.js worker bootstrap for Vite/ESM builds.
 * Configure the worker lazily on the client to avoid SSR issues.
 */

// Keep the worker script URL as a static asset import (safe in SSR)
import workerSrcUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

let initialized = false;

/**
 * Initialize PDF.js worker globally (idempotent).
 * Call this before using getDocument/rendering on the client.
 */
export async function initPdfJsWorker(): Promise<void> {
  if (initialized) return;
  if (typeof window === "undefined") return;
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrcUrl as unknown as string;
  initialized = true;
}
