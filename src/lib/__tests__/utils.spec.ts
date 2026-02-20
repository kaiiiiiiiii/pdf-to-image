import { describe, expect, it } from "vitest";

import { makeClientId } from "../utils";

describe("makeClientId", () => {
  it("returns unique identifiers", () => {
    const seen = new Set<string>();

    for (let i = 0; i < 25; i += 1) {
      const id = makeClientId();
      expect(id).toBeTypeOf("string");
      expect(id.length).toBeGreaterThan(8);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  it("falls back when crypto is unavailable", () => {
    const id = makeClientId(null);
    expect(id.startsWith("id_")).toBe(true);
  });
});
