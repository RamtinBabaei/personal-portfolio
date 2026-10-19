import { afterEach, describe, expect, it, vi } from "vitest";
import { runtime, runtimeFetch, withRuntime } from "@/lib/server/runtime";

afterEach(() => vi.unstubAllGlobals());

describe("request-scoped outbound transport", () => {
  it("retains the platform fallback outside a Worker request", () => {
    const fallback = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fallback);
    expect(runtimeFetch()).toBe(fallback);
  });

  it("uses the Worker transport even if rendering replaces global fetch", async () => {
    const outbound = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "test-provider-id" }));
    const framework = vi
      .fn<typeof fetch>()
      .mockRejectedValue(
        new Error("A rendering fetch wrapper must not handle email"),
      );
    vi.stubGlobal("fetch", framework);

    await withRuntime(
      { SITE_URL: "owner@example.com" },
      async () => {
        const response = await runtimeFetch()("https://api.resend.com/emails", {
          method: "POST",
        });
        expect(await response.json()).toEqual({ id: "test-provider-id" });
      },
      outbound,
    );

    expect(outbound).toHaveBeenCalledOnce();
    expect(framework).not.toHaveBeenCalled();
    expect(runtimeFetch()).toBe(framework);
  });

  it("isolates credentials and transports across concurrent requests", async () => {
    const first = vi.fn<typeof fetch>();
    const second = vi.fn<typeof fetch>();
    const values = await Promise.all(
      [first, second].map((transport, index) =>
        withRuntime(
          { RESEND_API_KEY: "synthetic-key-" + index },
          async () => {
            await Promise.resolve();
            await Promise.resolve();
            expect(runtimeFetch()).toBe(transport);
            return runtime().RESEND_API_KEY;
          },
          transport,
        ),
      ),
    );
    expect(values).toEqual(["synthetic-key-0", "synthetic-key-1"]);
  });

  it("restores the outer transport after a nested scope rejects", async () => {
    const outer = vi.fn<typeof fetch>();
    const inner = vi.fn<typeof fetch>();
    await withRuntime(
      { SITE_URL: "outer@example.com" },
      async () => {
        await expect(
          withRuntime(
            { SITE_URL: "inner@example.com" },
            async () => {
              expect(runtimeFetch()).toBe(inner);
              throw new Error("Synthetic nested failure");
            },
            inner,
          ),
        ).rejects.toThrow("Synthetic nested failure");
        expect(runtimeFetch()).toBe(outer);
        expect(runtime().SITE_URL).toBe("outer@example.com");
      },
      outer,
    );
  });
});
