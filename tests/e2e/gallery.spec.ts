import { expect, test } from "@playwright/test";
import { loginAsTestUser } from "./helpers/auth";
import { getTestCredentials } from "./helpers/load-env";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Gallery upload", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getTestCredentials();
    test.skip(!email || !password, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env");
    await loginAsTestUser(page);
  });

  test("upload image opens confirm modal and completes", async ({ page }) => {
    await page.goto("/gallery");
    await expect(page.getByRole("heading", { name: "游戏媒体库", level: 1 })).toBeVisible();

    const gameName = `E2E_Gallery_${Date.now()}`;
    await page.goto("/games");
    await page.getByRole("button", { name: "添加新游戏" }).click();
    const gameDialog = page.getByRole("dialog");
    await gameDialog.locator('input[type="text"]').first().fill(gameName);
    await gameDialog.locator("select").nth(0).selectOption({ label: "RPG" });
    await gameDialog.locator("select").nth(1).selectOption({ label: "正在玩" });
    await gameDialog.getByRole("button", { name: "添加游戏" }).click();
    await expect(page.getByText(gameName).first()).toBeVisible();

    await page.goto("/gallery");
    await page.getByTestId("gallery-upload-image").click();

    await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
      name: "e2e-test.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });

    const uploadDialog = page.getByRole("dialog");
    await expect(
      uploadDialog.getByRole("heading", { name: "确认上传" }),
    ).toBeVisible();
    await uploadDialog.locator("select").selectOption({ label: gameName });
    await uploadDialog.getByRole("button", { name: /确认上传/ }).click();

    await expect(
      page.getByText(/成功上传|已尝试存本机/).first(),
    ).toBeVisible({ timeout: 30000 });
  });
});
