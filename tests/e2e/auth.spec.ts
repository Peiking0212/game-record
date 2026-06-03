import { expect, test } from "@playwright/test";
import { getTestCredentials } from "./helpers/load-env";
import { loginAsTestUser } from "./helpers/auth";

test.describe("Auth", () => {
  test("shows login form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: "账号" })).toBeVisible();
    await expect(page.getByTestId("auth-email")).toBeVisible();
    await expect(page.getByTestId("auth-password")).toBeVisible();
  });

  test("login with test credentials", async ({ page }) => {
    const { email, password } = getTestCredentials();
    test.skip(!email || !password, "Set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env");

    const ok = await loginAsTestUser(page);
    expect(ok).toBe(true);
    await expect(page.getByRole("heading", { name: /欢迎来到我的游戏世界/ })).toBeVisible({
      timeout: 15000,
    });
  });

  test("rejects invalid password", async ({ page }) => {
    const { email } = getTestCredentials();
    test.skip(!email, "Set TEST_USER_EMAIL in .env");

    await page.goto("/auth");
    await page.getByTestId("auth-email").fill(email);
    await page.getByTestId("auth-password").fill("invalid-password-xyz-000");
    await page.getByTestId("auth-submit").click();
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByRole("alert").or(page.locator("p").filter({ hasText: /失败|Invalid|invalid/i }))).toBeVisible();
  });
});
