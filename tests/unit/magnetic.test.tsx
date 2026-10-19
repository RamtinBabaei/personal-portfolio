import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { magneticOffset, MAGNETIC_RADIUS } from "@/lib/motion";
import { MagneticButton } from "@/components/magnetic-button";
import { ContactForm } from "@/components/contact-form";

describe("magnetic displacement and native controls", () => {
  it.each([
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ])("bounds direction (%s,%s) to a circular radius", (x, y) => {
    const point = magneticOffset(x * 10000, y * 10000);
    expect(Math.hypot(point.x, point.y)).toBeCloseTo(MAGNETIC_RADIUS, 7);
    expect(Math.sign(point.x)).toBe(x);
    expect(Math.sign(point.y)).toBe(y);
  });
  it("rests exactly at center and responds proportionally near it", () => {
    expect(magneticOffset(0, 0)).toEqual({ x: 0, y: 0 });
    const near = magneticOffset(10, 10);
    const farther = magneticOffset(20, 20);
    expect(farther.x).toBeCloseTo(near.x * 2);
    expect(farther.y).toBeCloseTo(near.y * 2);
    expect(Math.hypot(farther.x, farther.y)).toBeLessThan(MAGNETIC_RADIUS);
  });
  it("retains the native localized About link without legacy magnetic selectors", () => {
    const html = renderToStaticMarkup(
      <MagneticButton href="/fa/about">بیشتر درباره من</MagneticButton>,
    );
    expect(html).toContain('href="/fa/about"');
    expect(html).toContain("magnetic-fill");
    expect(html).toContain('data-magnetic-radius="18"');
    expect(html).not.toMatch(/\sdata-magnetic(?:=|\s|>)/);
  });
  it("preserves a native external link and reusable pill shape", () => {
    const html = renderToStaticMarkup(
      <MagneticButton
        href="https://github.com/RamtinBabaei"
        shape="pill"
        external
      >
        Explore GitHub
      </MagneticButton>,
    );
    expect(html).toContain("magnetic-button--pill");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('href="https://github.com/RamtinBabaei"');
  });
  it("uses a real disabled submit button with an accessible busy state", () => {
    const html = renderToStaticMarkup(
      <MagneticButton type="submit" disabled busy>
        Sending…
      </MagneticButton>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
  });
  it("renders five numbered questions and six semantic service checkboxes", () => {
    const html = renderToStaticMarkup(<ContactForm locale="en" />);
    expect(html.match(/type="checkbox"/g)).toHaveLength(6);
    expect(html.match(/type="radio"/g)).toBeNull();
    expect(html.match(/class="contact-field-index"/g)).toHaveLength(5);
    expect(html).toContain('name="services"');
    expect(html).toContain('value="fullstack"');
    expect(html).toContain('name="company"');
    expect(html).toContain('autoComplete="organization"');
    expect(html).toContain("<legend>");
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('name="subject"');
    expect(html).not.toContain("RESEND_API_KEY");
  });
  it("renders Persian service labels and contact form instructions", () => {
    const html = renderToStaticMarkup(<ContactForm locale="fa" />);
    expect(html).toContain("توسعه فول‌استک");
    expect(html).toContain("بازطراحی وب‌سایت");
    expect(html).toContain("یک یا چند خدمت");
  });
});
