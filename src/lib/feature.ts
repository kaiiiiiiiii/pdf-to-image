/**
 * Feature detection helpers for runtime and cross-browser support.
 */

export function supportsOffscreenCanvas(): boolean {
  try {
    return typeof OffscreenCanvas !== "undefined";
  } catch {
    return false;
  }
}

let webpSupported: boolean | null = null;
export function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported;
  try {
    const c = document.createElement("canvas");
    webpSupported = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    webpSupported = false;
  }
  return webpSupported;
}

export function dpr(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

export function canAnchorDownload(): boolean {
  try {
    const a = document.createElement("a");
    return "download" in a;
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent);
}

export function supportsModuleWorker(): boolean {
  try {
    const blob = new Blob(["export {};"], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url, { type: "module" as any });
    w.terminate();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
