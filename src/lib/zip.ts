import JSZip from "jszip";

export interface ZipEntry {
  path: string;
  data: Blob | ArrayBuffer | Uint8Array;
}

export async function zipFiles(
  entries: Array<ZipEntry>,
  options?: { level?: number },
): Promise<Blob> {
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.path, e.data as any);
  }
  const level = options?.level ?? 6;
  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level },
  });
}
