import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { getTestCredentials } from "./helpers/load-env";

test.describe("Wishlist cloud", () => {
  test.setTimeout(120_000);
  test.beforeEach(async ({ page }) => {
    const { email, password } = getTestCredentials();
    test.skip(!email || !password, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env");
    await loginAsTestUser(page);
  });

  test("add wishlist item locally", async ({ page }) => {
    const name = `E2E_Wish_${Date.now()}`;
    await page.goto("/wishlist");
    await expect(page.getByRole("heading", { name: "游戏愿望单", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "添加愿望" }).first().click();
    const dialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: "添加愿望" }) });
    await dialog.getByTestId("wishlist-name-input").fill(name);
    await dialog.getByTestId("wishlist-rating-3").click();
    await dialog.getByTestId("wishlist-save-btn").click();

    await expect(page.getByText(/愿望单已添加/).first()).toBeVisible({
      timeout: 90000,
    });
    await expect(
      page.locator(".wishlist-name").filter({ hasText: /^E2E_Wish_/ }).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test("lookup-game modal opens for unmatched item", async ({ page }) => {
    const name = `E2E_Lookup_${Date.now()}`;
    await page.goto("/wishlist");
    await page.getByRole("button", { name: "添加愿望" }).first().click();
    const addDialog = page
      .getByRole("dialog")
      .filter({ has: page.getByRole("heading", { name: "添加愿望" }) });
    await addDialog.getByTestId("wishlist-name-input").fill(name);
    await addDialog.getByTestId("wishlist-rating-3").click();
    await addDialog.getByTestId("wishlist-save-btn").click();
    await expect(page.getByText(/愿望单已添加/).first()).toBeVisible({
      timeout: 90000,
    });

    const lookupBtn = page.getByTestId("wishlist-lookup-btn").first();
    const hasLookup = await lookupBtn.isVisible({ timeout: 8000 }).catch(() => false);
    test.skip(!hasLookup, "Auto lookup linked item to cloud; no manual入库 button");

    await lookupBtn.click();
    await expect(page.getByRole("heading", { name: "从 Steam 搜索入库" })).toBeVisible();
    await expect(page.getByTestId("wishlist-lookup-query")).toHaveValue(name);
  });

  test("sync cloud catalog button visible when signed in", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.getByRole("button", { name: "同步云端清单" })).toBeVisible();
  });

  test("mascot widget visible on wishlist", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.getByTestId("mascot-container")).toBeVisible();
    await expect(page.getByTestId("mascot-speech")).toBeAttached();
  });

  test("email alerts panel when signed in", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.getByTestId("wishlist-email-panel")).toBeVisible();
    await expect(page.getByText(/邮件降价提醒/)).toBeVisible();
  });

  test("alerts panel and target price row when signed in", async ({ page }) => {
    await page.goto("/wishlist");
    await expect(page.locator("#wishlist-alerts-panel")).toBeVisible();
    const saveAlert = page.getByTestId("wishlist-save-alert-btn").first();
    const lookupBtn = page.getByTestId("wishlist-lookup-btn").first();
    await expect(saveAlert.or(lookupBtn)).toBeVisible({ timeout: 15000 });
  });
});
