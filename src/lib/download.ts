/**
 * Client-side download utilities
 */

export interface DownloadEntry {
  blob: Blob;
  filename: string;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Revoke on next frame to avoid some browser issues with immediate revocation
    requestAnimationFrame(() => URL.revokeObjectURL(url));
  }
}

export async function downloadMany(entries: Array<DownloadEntry>) {
  for (const e of entries) {
    downloadBlob(e.blob, e.filename);
    // Tiny delay may improve stability with aggressive popup blockers
    // but generally user-initiated click should allow multiple downloads.

    await new Promise((r) => setTimeout(r, 10));
  }
}
