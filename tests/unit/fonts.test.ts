import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { fontResponse } from "@/lib/server/fonts";

describe("same-origin licensed font responses", () => {
  it("serves the exact source files with font MIME and caching headers", async () => {
    for (const name of ["manrope-latin.woff2", "vazirmatn-arabic.woff2"]) {
      const response = fontResponse(name);
      const bytes = Buffer.from(await response.arrayBuffer());
      expect(
        bytes.equals(
          readFileSync(new URL("../../public/fonts/" + name, import.meta.url)),
        ),
      ).toBe(true);
      expect(bytes.subarray(0, 4).toString()).toBe("wOF2");
      expect(response.headers.get("Content-Type")).toBe("font/woff2");
      expect(response.headers.get("Cache-Control")).toContain("max-age=");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    }
  });
  it("rejects unknown names, traversal and inherited object keys", () => {
    for (const name of [
      "unknown.woff2",
      "../secret",
      "constructor",
      "__proto__",
    ])
      expect(fontResponse(name).status).toBe(404);
  });
  it("revalidates with an empty 304 and retains reusable byte data", async () => {
    const first = fontResponse("manrope-latin.woff2");
    const cached = fontResponse(
      "manrope-latin.woff2",
      first.headers.get("ETag"),
    );
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe("");
    const again = fontResponse("manrope-latin.woff2");
    expect(
      Buffer.from(await first.arrayBuffer()).equals(
        Buffer.from(await again.arrayBuffer()),
      ),
    ).toBe(true);
  });
});
