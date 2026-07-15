import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";

const ROUTES = [
  "/",
  "/games",
  "/gallery",
  "/wishlist",
  "/reviews",
  "/profile",
  "/spending",
  "/stats",
  "/achievements",
  "/report",
  "/settings",
];

test("migrated pages use a compact section rhythm without horizontal overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const loggedIn = await loginAsTestUser(page);
  test.skip(!loggedIn, "需要 E2E 测试账号检查受保护页面");

  for (const route of ROUTES) {
    await page.goto(route);
    await page.locator("main").waitFor({ state: "visible" });

    const layout = await page.locator("main").evaluate((main) => {
      const spacedSections = Array.from(
        main.querySelectorAll<HTMLElement>(":scope > section[class*='py-']:not(.sticky)"),
      );
      const paddings = spacedSections.map((section) => {
        const style = getComputedStyle(section);
        return Math.max(parseFloat(style.paddingTop), parseFloat(style.paddingBottom));
      });

      return {
        maxSectionPadding: paddings.length ? Math.max(...paddings) : 0,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    expect(layout.maxSectionPadding, `${route} section padding`).toBeLessThanOrEqual(48);
    expect(layout.hasHorizontalOverflow, `${route} horizontal overflow`).toBe(false);
  }
});

test("home page does not stack wrapper and child section padding", async ({ page }) => {
  const loggedIn = await loginAsTestUser(page);
  test.skip(!loggedIn, "需要 E2E 测试账号检查首页");
  await page.goto("/");

  const wrapper = page.locator("[data-home-content]");
  await expect(wrapper).toBeVisible();
  expect(await wrapper.evaluate((element) => parseFloat(getComputedStyle(element).paddingTop))).toBe(0);

  const headingWrapper = wrapper.locator("section .container > .text-center").first();
  expect(await headingWrapper.evaluate((element) => getComputedStyle(element).boxShadow)).toBe("none");
});
