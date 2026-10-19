import { describe, it, expect } from "vitest";
import {
  blankEntry,
  entrySchema,
  contactSchema,
  localizedPath,
  encodeEntry,
  decodeEntry,
  toWorkCards,
} from "@/lib/domain";
describe("content validation", () => {
  it("keeps full case-study bodies out of public filter component payloads", () => {
    const row = decodeEntry(
      encodeEntry({
        ...blankEntry(),
        slug: "project-one",
        en: { ...blankEntry().en, body: "Long case study" },
      }),
    );
    const card = toWorkCards([row])[0];
    expect(card.en).not.toHaveProperty("body");
    expect(card).not.toHaveProperty("gallery");
  });
  it("accepts an incomplete bilingual draft with a valid slug", () => {
    expect(
      entrySchema.safeParse({ ...blankEntry(), slug: "new-project" }).success,
    ).toBe(true);
  });
  it("requires content in both languages before publication", () => {
    expect(
      entrySchema.safeParse({
        ...blankEntry(),
        slug: "new-project",
        status: "published",
      }).success,
    ).toBe(false);
  });
  it("rejects unsafe external links", () => {
    for (const url of [
      "javascript:alert(1)",
      "http://example.com",
      "data:text/html,test",
    ]) {
      expect(
        entrySchema.safeParse({
          ...blankEntry(),
          slug: "new-project",
          liveUrl: url,
        }).success,
      ).toBe(false);
    }
  });
  it("rejects invalid slugs", () => {
    for (const slug of ["../admin", "UPPER", "hello world", "a--b"]) {
      expect(entrySchema.safeParse({ ...blankEntry(), slug }).success).toBe(
        false,
      );
    }
  });
  it("requires image alt text before publishing", () => {
    const e = blankEntry();
    e.slug = "project-one";
    e.status = "published";
    e.cover = "/api/media/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
    e.en.title = e.fa.title = "Project";
    e.en.summary = e.fa.summary = "A useful project description";
    expect(entrySchema.safeParse(e).success).toBe(false);
    e.en.alt = e.fa.alt = "A screenshot";
    expect(entrySchema.safeParse(e).success).toBe(true);
  });
  it("round trips data without losing Persian text", () => {
    const e = { ...blankEntry(), slug: "persian-project" };
    e.fa.title = "پروژه من";
    expect(decodeEntry(encodeEntry(e)).fa.title).toBe("پروژه من");
  });
  it("rejects excessive media and technologies", () => {
    expect(
      entrySchema.safeParse({
        ...blankEntry(),
        slug: "project-one",
        technologies: Array(21).fill("JS"),
      }).success,
    ).toBe(false);
  });
  it("switches languages while preserving route", () => {
    expect(localizedPath("/en/work/project-one", "fa")).toBe(
      "/fa/work/project-one",
    );
    expect(localizedPath("/fa/contact", "en")).toBe("/en/contact");
  });
  it("rejects header newlines in subjects", () => {
    expect(
      contactSchema.safeParse({
        name: "Test",
        email: "test@example.com",
        subject: "Hi\nBcc:test@example.com",
        services: ["frontend"],
        message: "This is a sufficiently long message.",
        idempotencyKey: crypto.randomUUID(),
        startedAt: Date.now(),
      }).success,
    ).toBe(false);
  });
});
