import { test, expect } from "@playwright/test";
test("public journey, theme, language, and responsive layout", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Good ideas",
  );
  if (isMobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Work", exact: true })
      .click();
  } else
    await page
      .getByRole("navigation")
      .first()
      .getByRole("link", { name: "Work", exact: true })
      .click();
  await expect(page).toHaveURL(/\/en\/work/);
  await page.getByRole("button", { name: "Frontend" }).click();
  await expect(page.getByRole("button", { name: "Frontend" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Change color theme" }).click();
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme!);
  await page.getByRole("link", { name: "Switch to Persian" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("contact validates fields and shows delivery failure honestly", async ({
  page,
}) => {
  await page.goto("/en/contact");
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await page.getByLabel("Your name").fill("Test Visitor");
  await page.getByLabel("Your email").fill("test@example.com");
  await page
    .getByLabel("Company or organization", { exact: false })
    .fill("Example Studio");
  await page
    .getByRole("checkbox", { name: "Full-Stack Development", exact: true })
    .check();
  await page
    .getByLabel("Tell me about it")
    .fill("I would like to discuss a new website for my business.");
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "EMAIL_UNAVAILABLE" }),
    }),
  );
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The email service is temporarily unavailable",
  );
});
test("contact retains fields when storage acceptance does not confirm email acceptance", async ({
  page,
}) => {
  await page.goto("/en/contact");
  await page.getByLabel("Your name").fill("Test Visitor");
  await page.getByLabel("Your email").fill("test@example.com");
  await page
    .getByLabel("Company or organization", { exact: false })
    .fill("Example Studio");
  await page
    .getByRole("checkbox", { name: "Full-Stack Development", exact: true })
    .check();
  await page
    .getByLabel("Tell me about it")
    .fill("I would like to discuss a new website for my business.");
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accepted: true,
        reference: "00000000-0000-4000-8000-000000000001",
        sent: false,
      }),
    }),
  );
  await page.getByRole("button", { name: "Send inquiry" }).click();
  await expect(
    page.locator(".contact-feedback").getByRole("alert"),
  ).toContainText("couldn't be sent");
  await expect(page.getByLabel("Your name")).toHaveValue("Test Visitor");
});
test("reduced motion keeps all content readable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".hero-word").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("animated navigation releases its cover and restores page focus", async ({
  page,
}) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const menu = page.getByRole("dialog");
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(menu).not.toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-navigating",
    "true",
    { timeout: 10000 },
  );
  await expect(page.locator("main h1")).toBeFocused();
  await page.goBack();
  await expect(page).toHaveURL(/\/en$/);
});

test("titles pause, the portrait preserves its ratio, and removed routes return 404", async ({
  page,
}) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Pause title animation" }).click();
  await expect(
    page.getByRole("button", { name: "Play title animation" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".hero-roles")).toHaveAttribute(
    "data-running",
    "false",
  );
  const photo = page.locator(".intro-image > img");
  await photo.scrollIntoViewIfNeeded();
  await expect(photo).toHaveCSS("object-fit", "contain");
  const geometry = await photo.boundingBox();
  expect(geometry).not.toBeNull();
  expect(geometry!.width / geometry!.height).toBeCloseTo(1.5, 1);
  const response = await page.goto("/en/notes");
  expect(response?.status()).toBe(404);
});

test("scroll reverses title direction and exposes the compact menu", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  await page.locator(".hero-roles").scrollIntoViewIfNeeded();
  await expect(page.locator(".hero-roles")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.evaluate(() => window.scrollBy({ top: 100, behavior: "instant" }));
  await expect(page.locator(".hero-roles")).toHaveAttribute(
    "data-direction",
    "forward",
  );
  await page.evaluate(() => window.scrollBy({ top: -90, behavior: "instant" }));
  await expect(page.locator(".hero-roles")).toHaveAttribute(
    "data-direction",
    "reverse",
  );
  await page.locator(".floating-menu").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("footer motion follows scroll position in both directions", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  const footer = page.locator(".site-footer");
  const edge = page.locator(".footer-edge");
  await expect
    .poll(() => edge.evaluate((el) => (el as HTMLElement).style.transform))
    .not.toBe("");
  const top = await footer.evaluate(
    (el) => el.getBoundingClientRect().top + scrollY,
  );
  const height = await page.evaluate(() => innerHeight);
  const scaleY = () =>
    edge.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    top - height + 20,
  );
  await expect.poll(scaleY).toBeGreaterThan(0.9);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    top - height * 0.22,
  );
  await expect.poll(scaleY).toBeLessThan(0.05);
  await page.evaluate(
    (y) => window.scrollTo({ top: y, behavior: "instant" }),
    top - height + 20,
  );
  await expect.poll(scaleY).toBeGreaterThan(0.9);
});

test("hero stays top-anchored and responsive routes do not overflow", async ({
  page,
}) => {
  for (const locale of ["en", "fa"]) {
    for (const route of ["", "/work", "/about", "/contact"]) {
      await page.goto("/" + locale + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (!route) {
        const hero = page.locator(".hero-image");
        await expect(hero).toHaveCSS("object-position", /0%$/);
        const box = await hero.boundingBox();
        expect(box!.height).toBeGreaterThan(100);
      }
      await page.locator(".theme-toggle").click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("service pills submit real selected values and support deselection", async ({
  page,
}) => {
  await page.goto("/en/contact");
  const frontend = page.getByRole("checkbox", {
    name: "Frontend Development",
    exact: true,
  });
  const backend = page.getByRole("checkbox", {
    name: "Backend & API Development",
    exact: true,
  });
  await frontend.check();
  await backend.check();
  await frontend.uncheck();
  await expect(frontend).not.toBeChecked();
  await expect(backend).toBeChecked();
  await page.getByLabel("Your name", { exact: true }).fill("Test Visitor");
  await page.getByLabel("Your email", { exact: true }).fill("test@example.com");
  await page
    .getByLabel("Company or organization", { exact: false })
    .fill("Example Studio");
  await page
    .getByLabel("Tell me about it", { exact: true })
    .fill("I would like a reliable API for a new web application.");
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/contact", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "EMAIL_UNAVAILABLE" }),
    });
  });
  await page.getByRole("button", { name: "Send inquiry", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(payload?.services).toEqual(["backend"]);
  expect(payload?.company).toBe("Example Studio");
  expect(payload?.budget).toBe("undecided");
  expect(payload?.idempotencyKey).toBeTruthy();
});

test("magnetic About action moves in every direction, stays bounded, and returns", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Mouse behavior applies to fine-pointer desktop only.");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/en");
  const root = page.locator(".intro-description .magnetic-button");
  const hit = root.locator(".magnetic-hit");
  const disc = root.locator(".magnetic-disc");
  await root.scrollIntoViewIfNeeded();
  await expect(root).toHaveAttribute("data-motion-ready", "true");
  const box = (await hit.boundingBox())!;
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const transform = () =>
    disc.evaluate((el) => {
      const matrix = new DOMMatrix(getComputedStyle(el).transform);
      return { x: matrix.m41, y: matrix.m42 };
    });
  const shape = (await disc.boundingBox())!;
  expect(shape.width).toBeCloseTo(shape.height, 1);
  await expect(disc).toHaveCSS("border-radius", "50%");
  for (const [x, y] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]) {
    const length = Math.hypot(x, y);
    await page.mouse.move(
      center.x + (x / length) * box.width * 0.4,
      center.y + (y / length) * box.height * 0.4,
    );
    await expect
      .poll(async () => {
        const point = await transform();
        return (x === 0 || point.x * x > 0.5) && (y === 0 || point.y * y > 0.5);
      })
      .toBe(true);
    const point = await transform();
    expect(Math.hypot(point.x, point.y)).toBeLessThanOrEqual(18.1);
  }
  await expect
    .poll(() =>
      root
        .locator(".magnetic-fill")
        .evaluate((el) =>
          parseFloat(getComputedStyle(el).getPropertyValue("--fill")),
        ),
    )
    .toBeLessThan(1);
  await page.mouse.move(box.x - 35, box.y);
  await expect
    .poll(async () => {
      const point = await transform();
      return Math.hypot(point.x, point.y);
    })
    .toBeLessThan(0.3);
  await expect
    .poll(() =>
      root
        .locator(".magnetic-fill")
        .evaluate((el) =>
          parseFloat(getComputedStyle(el).getPropertyValue("--fill")),
        ),
    )
    .toBeGreaterThan(104);
  await hit.focus();
  await expect(hit).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/about$/);
});

test("reduced-motion magnetic button remains centered and keyboard-usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const root = page.locator(".intro-description .magnetic-button");
  await root.locator("a").focus();
  await expect(root).not.toHaveAttribute("data-motion-ready", "true");
  await expect(root.locator(".magnetic-disc")).toHaveCSS("transform", "none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/en\/about$/);
});

test("contact controls retain visible native keyboard selection", async ({
  page,
}) => {
  await page.goto("/en/contact");
  const checkbox = page.getByRole("checkbox", {
    name: "Frontend Development",
    exact: true,
  });
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  await page.getByRole("button", { name: "Send inquiry", exact: true }).click();
  await expect(
    page.getByText("Select at least one service.", { exact: true }),
  ).toBeVisible();
});

test("touch keeps a circular About action and native navigation", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch interaction applies to mobile/tablet projects.");
  await page.goto("/en");
  const root = page.locator(".intro-description .magnetic-button");
  await root.scrollIntoViewIfNeeded();
  const box = (await root.locator(".magnetic-disc").boundingBox())!;
  expect(box.width).toBeCloseTo(box.height, 1);
  await root.locator("a").tap();
  await expect(page).toHaveURL(/\/en\/about$/);
});

test("contact keeps portrait and details in one rail with five questions", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en/contact");
  const rail = page.locator(".contact-aside");
  await expect(rail.locator(".contact-portrait img")).toBeVisible();
  await expect(
    rail.getByRole("link", { name: "ramtin.babaei2002@gmail.com" }),
  ).toBeVisible();
  await expect(page.locator(".contact-field-index")).toHaveCount(5);
  await expect(page.getByRole("checkbox")).toHaveCount(6);
  const photo = await rail.locator(".contact-portrait").boundingBox();
  const details = await rail.locator(":scope > div").nth(1).boundingBox();
  expect(details!.y - (photo!.y + photo!.height)).toBeLessThan(55);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (isMobile)
    expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe(
      "static",
    );
});

test("administrator pages and APIs reject anonymous access", async ({
  request,
}) => {
  for (const path of [
    "/en/studio/inquiries",
    "/fa/studio/projects",
    "/api/studio/inquiries",
    "/api/studio/entries",
  ])
    expect([401, 503]).toContain((await request.get(path)).status());
});

test("homepage pill interactions preserve destinations and return to rest", async ({
  page,
  isMobile,
}) => {
  await page.goto("/en");
  const github = page.getByRole("link", { name: "Explore GitHub" });
  await expect(github).toHaveAttribute(
    "href",
    "https://github.com/RamtinBabaei",
  );
  await expect(github).toHaveAttribute("rel", "noopener noreferrer");
  const pill = page.locator(".toolkit-section .magnetic-button--pill");
  await pill.scrollIntoViewIfNeeded();
  if (!isMobile) {
    await github.hover();
    await expect(pill).toHaveAttribute("data-motion-ready", "true");
    await expect
      .poll(() =>
        pill
          .locator(".magnetic-fill")
          .evaluate((el) =>
            Number.parseFloat(getComputedStyle(el).getPropertyValue("--fill")),
          ),
      )
      .toBeLessThan(1);
    await page.mouse.move(1, 1);
    await expect
      .poll(() =>
        pill.locator(".magnetic-disc").evaluate((el) => {
          const m = new DOMMatrix(getComputedStyle(el).transform);
          return Math.hypot(m.m41, m.m42);
        }),
      )
      .toBeLessThan(0.2);
  }
});
