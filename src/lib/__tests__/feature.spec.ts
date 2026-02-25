import { beforeEach, describe, expect, it, vi } from "vitest";

describe("feature detection utilities", () => {
  beforeEach(() => {
    // Reset modules between tests to clear internal module state cache (e.g., webpSupported)
    vi.resetModules();
  });

  it("supportsWebP detects positive via canvas data URL", async () => {
    const originalCreate = (document as any).createElement;
    (document as any).createElement = vi.fn().mockImplementation((tag: string) => {
      const el = originalCreate.call(document, tag);
      if (tag.toLowerCase() === "canvas") {
        el.toDataURL = vi.fn().mockReturnValue("data:image/webp;base64,AAA");
      }
      return el;
    });

    const { supportsWebP } = await import("../feature");
    expect(supportsWebP()).toBe(true);
    (document as any).createElement = originalCreate;
  });

  it("supportsWebP detects negative when toDataURL throws", async () => {
    const originalCreate = (document as any).createElement;
    (document as any).createElement = vi.fn().mockImplementation((tag: string) => {
      const el = originalCreate.call(document, tag);
      if (tag.toLowerCase() === "canvas") {
        el.toDataURL = vi.fn().mockImplementation(() => {
          throw new Error("not supported");
        });
      }
      return el;
    });

    const { supportsWebP } = await import("../feature");
    expect(supportsWebP()).toBe(false);
    (document as any).createElement = originalCreate;
  });

  it("dpr returns devicePixelRatio when available", async () => {
    const { dpr } = await import("../feature");
    const orig = (window as any).devicePixelRatio;
    (window as any).devicePixelRatio = 2;
    expect(dpr()).toBe(2);
    (window as any).devicePixelRatio = orig;
  });

  it("supportsOffscreenCanvas reflects global availability", async () => {
    const { supportsOffscreenCanvas } = await import("../feature");
    const orig = (globalThis as any).OffscreenCanvas;
    (globalThis as any).OffscreenCanvas = function OffscreenCanvas() {};
    expect(supportsOffscreenCanvas()).toBe(true);
    (globalThis as any).OffscreenCanvas = undefined;
    expect(supportsOffscreenCanvas()).toBe(false);
    (globalThis as any).OffscreenCanvas = orig;
  });

  it("canAnchorDownload reports presence of download attribute", async () => {
    const { canAnchorDownload } = await import("../feature");
    expect(canAnchorDownload()).toBe(true);
  });
});
