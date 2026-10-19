import { describe, it, expect } from "vitest";
import {
  navigationItems,
  transitionDestination,
  pageLabel,
} from "@/lib/navigation";
import { blankEntry, entrySchema } from "@/lib/domain";

const current = "https://portfolio.example/en";
describe("public navigation boundaries", () => {
  it("covers all four public pages in English and Persian", () => {
    expect(navigationItems("en").map((item) => item.label)).toEqual([
      "Home",
      "Work",
      "About",
      "Contact",
    ]);
    expect(navigationItems("fa").map((item) => item.href)).toEqual([
      "/fa",
      "/fa/work",
      "/fa/about",
      "/fa/contact",
    ]);
  });
  it("allows public page and project transitions while preserving query and hash", () => {
    expect(
      transitionDestination("/en/work/project-one?view=full#details", current),
    ).toBe("/en/work/project-one?view=full#details");
    expect(
      transitionDestination(
        "/en/work",
        "https://portfolio.example/en/studio/projects",
      ),
    ).toBeNull();
    expect(pageLabel("/en/work/project-one", "en")).toBe("View project");
  });
  it("leaves external, sign-in, studio, cross-language, and hash-only navigation native", () => {
    for (const href of [
      "https://elsewhere.example/en/work",
      "mailto:me@example.com",
      "/signin-with-chatgpt",
      "/en/studio/projects",
      "/fa/work",
      "#introduction",
      "/en",
      "/en/notes",
      "/api/studio/entries",
    ])
      expect(transitionDestination(href, current)).toBeNull();
  });
  it("rejects removed article content at the schema boundary", () => {
    expect(
      entrySchema.safeParse({
        ...blankEntry(),
        kind: "article",
        slug: "old-note",
      }).success,
    ).toBe(false);
  });
});
