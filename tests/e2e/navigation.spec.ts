import { expect, test } from "@playwright/test";

const ROUTES: { path: string; heading: string | RegExp; level?: 1 | 2 }[] = [
  { path: "/", heading: /账号登录/ },
  { path: "/games", heading: /我的游戏收藏/ },
  { path: "/gallery", heading: /游戏图库/ },
  { path: "/wishlist", heading: /游戏愿望单/ },
  { path: "/reviews", heading: /游戏评测/ },
  { path: "/profile", heading: /游戏玩家/ },
  { path: "/spending", heading: /消费记录/ },
  { path: "/stats", heading: /游戏统计/ },
  { path: "/achievements", heading: /成就殿堂/ },
  { path: "/report", heading: /年度游戏报告/, level: 2 },
  { path: "/auth", heading: /账号登录/ },
];

test.describe("Route smoke (desktop + mobile)", () => {
  for (const route of ROUTES) {
    test(`navigate ${route.path}`, async ({ page }) => {
      await page.goto(route.path);
      await expect(
        page.getByRole("heading", {
          name: route.heading,
          level: route.level ?? 1,
        }),
      ).toBeVisible({ timeout: 15000 });
    });
  }
});
