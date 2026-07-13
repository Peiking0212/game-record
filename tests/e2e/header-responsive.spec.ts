import { expect, test } from "@playwright/test";

test("desktop navigation labels stay on one line", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const desktopNav = page.locator(".desktop-nav");
  await expect(desktopNav).toBeVisible();

  for (const label of ["首页", "个人主页", "游戏收藏", "成就系统", "数据统计", "年度报告", "消费记录"]) {
    const link = desktopNav.getByRole("link", { name: label, exact: true });
    await expect(link).toBeVisible();
    expect(await link.evaluate((element) => getComputedStyle(element).whiteSpace)).toBe("nowrap");
  }

  expect(
    await page.locator("header").evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
});

test("tablet width switches to the compact menu", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await expect(page.locator(".desktop-nav")).toBeHidden();
  await expect(page.getByRole("button", { name: "菜单" })).toBeVisible();
});
