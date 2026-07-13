import { expect, test } from "@playwright/test";

test.describe("stats charts", () => {
  test("renders the three summary charts", async ({ page }) => {
    await page.addInitScript(() => {
      const year = new Date().getFullYear();
      localStorage.setItem(
        "games",
        JSON.stringify([
          {
            id: 9101,
            name: "Chart Seed One",
            type: "RPG",
            status: "playing",
            playtime: 42,
            progress: 65,
            lastPlayed: `${year}-04-12`,
          },
          {
            id: 9102,
            name: "Chart Seed Two",
            type: "Strategy",
            status: "completed",
            playtime: 28,
            progress: 100,
            lastPlayed: `${year}-05-20`,
          },
        ]),
      );
    });

    await page.goto("/stats");

    const charts = page.locator(".recharts-responsive-container");
    await expect(charts).toHaveCount(3);

    for (let index = 0; index < 3; index += 1) {
      const chart = charts.nth(index);
      await expect(chart.locator("svg[role='application']")).toBeVisible();

      const box = await chart.boundingBox();
      expect(box?.width).toBeGreaterThan(250);
      expect(box?.height).toBeGreaterThan(250);
    }

    await expect(page.locator(".recharts-pie-sector").first()).toBeVisible();
    await expect(page.locator(".recharts-line path").first()).toBeVisible();
  });
});
