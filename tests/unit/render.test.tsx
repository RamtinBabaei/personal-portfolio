import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroRoles } from "@/components/hero-roles";
import { Photo } from "@/components/ui-elements";
import { Toolkit } from "@/components/toolkit";
import { WorkGrid } from "@/components/work-grid";
import { blankEntry, toWorkCards } from "@/lib/domain";
import { Footer } from "@/components/footer";
import { Services } from "@/components/services";
import { ContactForm } from "@/components/contact-form";
describe("server-rendered public components", () => {
  it.each(["en", "fa"] as const)(
    "renders five numbered contact questions with proper labels in %s",
    (locale) => {
      const html = renderToStaticMarkup(<ContactForm locale={locale} />);
      expect(html.match(/class="contact-question"/g)).toHaveLength(5);
      expect(html).toContain('id="contact-name"');
      expect(html).toContain('id="contact-email"');
      expect(html).toContain('id="contact-company"');
      expect(html).toContain('id="contact-message"');
      expect(html.match(/type="checkbox"/g)).toHaveLength(6);
      expect(html).toContain('type="submit"');
      expect(html).not.toContain("RESEND_API_KEY");
    },
  );

  it("keeps the original workspace image dimensions and lazy loading", () => {
    const html = renderToStaticMarkup(
      <Photo name="workspace" alt="Ramtin at his laptop" />,
    );
    expect(html).toContain('width="1536"');
    expect(html).toContain('height="1024"');
    expect(html).toContain('loading="lazy"');
  });
  it("provides a static accessible professional title and a loop pause control", () => {
    const html = renderToStaticMarkup(<HeroRoles locale="en" />);
    expect(html).toContain("Full-Stack Developer &amp; Software Engineer");
    expect(html).toContain('aria-label="Pause title animation"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('aria-hidden="true"');
  });
  it("gives the hero high priority and responsive image sources", () => {
    const html = renderToStaticMarkup(
      <Photo name="hero" alt="Ramtin Babaei" priority />,
    );
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain("srcSet=");
    expect(html).toContain('width="1600"');
  });
  it("renders project empty state without invented projects", () => {
    const html = renderToStaticMarkup(
      <WorkGrid entries={[]} locale="en" filters />,
    );
    expect(html).toContain("The next chapter");
    expect(html).toContain("https://github.com/RamtinBabaei");
    expect(html).toContain('aria-pressed="true"');
  });
  it("renders Persian content", () => {
    const html = renderToStaticMarkup(<WorkGrid entries={[]} locale="fa" />);
    expect(html).toContain("فصل بعدی");
  });
  it("escapes content supplied through project management", () => {
    const entry = {
      ...blankEntry(),
      id: "x",
      slug: "x-test",
      createdAt: 0,
      updatedAt: 0,
    };
    entry.en.title = "<script>alert(1)</script>";
    const html = renderToStaticMarkup(
      <WorkGrid entries={[entry]} locale="en" />,
    );
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert(1)");
  });
  it("renders accessible skill tabs and panels", () => {
    const html = renderToStaticMarkup(<Toolkit locale="en" />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
  });
  it("renders real project metadata and accessible presentation controls", () => {
    const entry = {
      ...blankEntry(),
      id: "fixture",
      slug: "test-fixture",
      createdAt: 0,
      updatedAt: 0,
    };
    entry.en.title = "Fixture application";
    entry.year = 2026;
    entry.technologies = ["TypeScript", "React", "PostgreSQL", "Node", "Extra"];
    const html = renderToStaticMarkup(
      <WorkGrid entries={toWorkCards([entry])} locale="en" filters />,
    );
    expect(html).toContain('href="/en/work/test-fixture"');
    expect(html).toContain('aria-label="List view"');
    expect(html).toContain('aria-label="Gallery view"');
    expect(html).toContain("TypeScript / React / PostgreSQL / Node");
    expect(html).not.toContain("Extra");
    expect(html).toContain("2026");
  });
  it("retains direct email, professional links and a translated footer invitation", () => {
    const english = renderToStaticMarkup(<Footer locale="en" />);
    const persian = renderToStaticMarkup(<Footer locale="fa" />);
    expect(english).toContain('href="/en/contact"');
    expect(english).toContain("https://www.linkedin.com/in/ramtin-babaei");
    expect(english).toContain('href="/en/contact"');
    expect(english).toContain("Let’s build");
    expect(english).toContain("YOUR LOCAL TIME");
    expect(persian).toContain("فصل بعد را");
    expect(persian).toContain('href="/fa/contact"');
  });
  it("keeps service descriptions available through native disclosure elements", () => {
    const html = renderToStaticMarkup(<Services locale="en" />);
    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html.match(/<summary/g)).toHaveLength(3);
    expect(html).toMatch(/<details[^>]* open=""/);
  });
});
