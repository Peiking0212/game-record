import { expect, test } from "@playwright/test";

function nowDateISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

test.describe("Core user flows with edge cases", () => {
  test("normal flow: games -> reviews -> achievements -> spending -> stats -> report", async ({
    page,
  }) => {
    const gameName = `E2E_Game_${Date.now()}`;
    const reviewText = `E2E review for ${gameName}`;
    const achievementTitle = `E2E Achievement ${Date.now()}`;

    await page.goto("/games");
    await expect(page.getByRole("heading", { name: "我的游戏收藏" })).toBeVisible();

    await page.getByRole("button", { name: "添加新游戏" }).click();
    const gameDialog = page.getByRole("dialog");
    await gameDialog.locator('input[type="text"]').first().fill(gameName);
    await gameDialog.locator("select").nth(0).selectOption({ label: "RPG" });
    await gameDialog.locator("select").nth(1).selectOption({ label: "正在玩" });
    await gameDialog.locator('input[type="number"]').first().fill("12");
    await gameDialog.getByRole("button", { name: "添加游戏" }).click();
    await expect(page.getByText(gameName).first()).toBeVisible();

    await page.goto("/reviews");
    await expect(page.getByRole("heading", { name: "游戏评测", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "添加评测" }).first().click();
    const reviewDialog = page.getByRole("dialog");
    await reviewDialog.locator("select").first().selectOption({ label: gameName });
    await reviewDialog.locator("textarea").first().fill(reviewText);
    await reviewDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText(reviewText)).toBeVisible();

    await page.goto("/achievements");
    await expect(page.getByRole("heading", { name: "成就殿堂" })).toBeVisible();
    await page.getByRole("button", { name: "添加成就" }).first().click();
    const achievementDialog = page.getByRole("dialog");
    await achievementDialog.locator('input[type="text"]').first().fill(achievementTitle);
    await achievementDialog.locator("textarea").first().fill("完成复杂任务链路");
    await achievementDialog.locator("select").first().selectOption({ label: gameName });
    await achievementDialog.locator('input[type="date"]').first().fill(nowDateISO());
    await achievementDialog.getByRole("button", { name: "添加成就" }).click();
    await expect(page.getByText(achievementTitle).first()).toBeVisible();

    await page.goto("/spending");
    await expect(page.getByRole("heading", { name: "消费记录", exact: true })).toBeVisible();
    const spendingForm = page.locator("form").first();
    await spendingForm.locator("select").nth(0).selectOption("recharge");
    await spendingForm.locator("select").nth(1).selectOption({ label: gameName });
    await spendingForm.locator('input[type="number"]').first().fill("68.88");
    await spendingForm.locator('input[type="date"]').first().fill(nowDateISO());
    await spendingForm.getByRole("button", { name: "添加记录" }).click();
    await expect(page.getByText(gameName).first()).toBeVisible();

    await page.goto("/stats");
    await expect(page.getByRole("heading", { name: "游戏统计" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "游戏明细数据" })).toBeVisible();
    await expect(page.getByRole("cell", { name: gameName, exact: true })).toBeVisible();

    await page.goto("/report");
    await expect(page.getByRole("heading", { name: "年度游戏报告", level: 2 })).toBeVisible();
    const yearSelect = page.locator("#report-year");
    const options = await yearSelect.locator("option").allTextContents();
    const target = options.find((t) => /\d{4}\s*年/.test(t));
    if (target) {
      await yearSelect.selectOption({ label: target.trim() });
      await page.getByRole("button", { name: /生成报告/ }).click();
      await expect(page.getByText("年度回顾").first()).toBeVisible();
    }
  });

  test("edge flow: validation and blocking behavior", async ({ page }) => {
    await page.goto("/spending");
    await expect(page.getByRole("heading", { name: "消费记录", exact: true })).toBeVisible();
    const spendingForm = page.locator("form").first();
    await spendingForm.locator("select").nth(0).selectOption("purchase");
    await spendingForm.getByRole("button", { name: "添加记录" }).click();
    await expect(page.getByText(/请选择愿望单[内中]的游戏/)).toBeVisible();

    await page.goto("/achievements");
    await page.getByRole("button", { name: "添加成就" }).first().click();
    const achievementDialog = page.getByRole("dialog");
    await achievementDialog.locator('input[type="text"]').first().fill("Edge Case Achievement");
    await achievementDialog.locator("textarea").first().fill("校验未选游戏拦截");
    await achievementDialog.locator('input[type="date"]').first().fill(nowDateISO());
    await achievementDialog.getByRole("button", { name: "添加成就" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Edge Case Achievement")).not.toBeVisible();

    await page.goto("/report");
    await page.locator("select").first().selectOption({ value: "" });
    await page.getByRole("button", { name: /生成报告/ }).click();
    await expect(page.getByText("请先选择年份")).toBeVisible();
  });
});
