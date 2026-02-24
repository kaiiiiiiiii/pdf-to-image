import { describe, expect, it, vi } from "vitest";
import { canvasToBlob, fileNameFor, mimeForFormat } from "../../pdf/export";

describe("export helpers", () => {
  it("mimeForFormat returns correct MIME types", () => {
    expect(mimeForFormat("png")).toBe("image/png");
    expect(mimeForFormat("jpeg")).toBe("image/jpeg");
    expect(mimeForFormat("webp")).toBe("image/webp");
  });

  it("fileNameFor builds names with padded page numbers and proper extension", () => {
    expect(fileNameFor("doc.pdf", 1, "png")).toBe("doc-p01.png");
    expect(fileNameFor("my.file.name.pdf", 12, "jpeg")).toBe("my.file.name-p12.jpg");
    expect(fileNameFor("simple", 3, "webp")).toBe("simple-p03.webp");
  });

  it("canvasToBlob resolves with a blob from toBlob callback", async () => {
    const fakeBlob = new Blob(["abc"], { type: "image/png" });
    const canvas: any = {
      toBlob: (cb: (b: Blob | null) => void) => cb(fakeBlob),
    };
    const out = await canvasToBlob(canvas as HTMLCanvasElement, "image/png", 0.92);
    expect(out).toBeInstanceOf(Blob);
    expect(out.size).toBe(fakeBlob.size);
    expect(out.type).toBe("image/png");
  });

  it("canvasToBlob rejects when toBlob returns null", async () => {
    const canvas: any = {
      toBlob: (cb: (b: Blob | null) => void) => cb(null),
    };
    await expect(canvasToBlob(canvas as HTMLCanvasElement, "image/png", 0.92)).rejects.toThrow(
      /Failed to encode canvas to blob/i,
    );
  });

  it("canvasToBlob passes quality parameter through to toBlob", async () => {
    const toBlob = vi.fn((cb: (b: Blob | null) => void, type: string, _quality?: number) => {
      cb(new Blob(["x"], { type }));
    });
    const canvas: any = { toBlob };
    await canvasToBlob(canvas as HTMLCanvasElement, "image/jpeg", 0.8);
    expect(toBlob).toHaveBeenCalled();
    const args = toBlob.mock.calls[0];
    expect(args[1]).toBe("image/jpeg");
    expect(args[2]).toBe(0.8);
  });
});
