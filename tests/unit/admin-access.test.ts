import { describe, it, expect } from "vitest";
import { adminIdentity, protectAdminRequest } from "@/lib/server/admin-access";
import { authorizeCron } from "@/lib/server/outbox";
const env = {
  ADMIN_AUTH_MODE: "basic",
  ADMIN_USERNAME: "ramtin",
  ADMIN_PASSWORD: "private-test-password-01234567890123456789",
};
const basic = (password = env.ADMIN_PASSWORD) =>
  new Headers({ Authorization: "Basic " + btoa("ramtin:" + password) });
describe("private administrator and scheduler authentication", () => {
  it("fails closed when administrator configuration is missing or weak", async () => {
    await expect(adminIdentity(new Headers(), {})).rejects.toMatchObject({
      code: "ADMIN_UNCONFIGURED",
    });
    await expect(
      adminIdentity(basic(), { ...env, ADMIN_PASSWORD: "short" }),
    ).rejects.toMatchObject({ code: "ADMIN_UNCONFIGURED" });
  });
  it("rejects anonymous, wrong credentials, malformed authorization and forged identity headers in portable mode", async () => {
    for (const h of [
      new Headers(),
      basic("wrong"),
      new Headers({ Authorization: "Basic invalid!" }),
      new Headers({
        "oai-authenticated-user-id": "owner",
        "oai-authenticated-user-email": "owner@example.com",
      }),
    ])
      await expect(adminIdentity(h, env)).rejects.toMatchObject({
        status: 401,
      });
    await expect(adminIdentity(basic(), env)).resolves.toEqual({
      userId: "ramtin",
    });
  });
  it("protects pages and APIs with an HTTP challenge and no caching, while public pages remain anonymous", async () => {
    for (const path of [
      "/en/studio/inquiries",
      "/fa/studio/inquiries",
      "/api/studio/inquiries",
    ]) {
      const result = await protectAdminRequest(
        new Request("https://portfolio.test" + path),
        env,
      );
      expect(result?.status).toBe(401);
      expect(result?.headers.get("WWW-Authenticate")).toContain("Basic");
      expect(result?.headers.get("Cache-Control")).toContain("no-store");
    }
    expect(
      await protectAdminRequest(
        new Request("https://portfolio.test/en/contact"),
        env,
      ),
    ).toBeNull();
    expect(
      (
        await protectAdminRequest(
          new Request("http://portfolio.test/en/studio/inquiries", {
            headers: basic(),
          }),
          env,
        )
      )?.status,
    ).toBe(403);
    expect(
      await protectAdminRequest(
        new Request("http://127.0.0.1/en/studio/inquiries", {
          headers: basic(),
        }),
        env,
      ),
    ).toBeNull();
  });
  it("requires an explicit owner ID for Sites, and a signed identity for an independent proxy", async () => {
    const headers = new Headers({
      "oai-authenticated-user-id": "owner",
      "oai-authenticated-user-email": "owner@example.com",
    });
    await expect(
      adminIdentity(headers, { ADMIN_AUTH_MODE: "sites" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      adminIdentity(headers, {
        ADMIN_AUTH_MODE: "sites",
        ADMIN_USER_ID: "owner",
      }),
    ).resolves.toEqual({ userId: "owner" });
    await expect(
      adminIdentity(headers, {
        ADMIN_AUTH_MODE: "proxy",
        ADMIN_USER_ID: "owner",
        IDENTITY_PROXY_SECRET: "secret",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("requires an independent long server secret for the unattended job", async () => {
    const secret = "private-test-cron-secret-01234567890123456789";
    const request = (token: string) =>
      new Request("https://portfolio.test/api/internal/contact-outbox", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      });
    await expect(
      authorizeCron(request(secret), secret),
    ).resolves.toBeUndefined();
    await expect(authorizeCron(request("wrong"), secret)).rejects.toMatchObject(
      { status: 401 },
    );
    await expect(authorizeCron(request(secret))).rejects.toMatchObject({
      status: 503,
    });
  });
});
