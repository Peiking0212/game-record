import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { getTestCredentials } from "./load-env";

export async function loginAsTestUser(page: Page): Promise<boolean> {
  const { email, password } = getTestCredentials();
  if (!email || !password) return false;

  await page.goto("/auth");
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  const signedInMarker = page
    .getByRole("heading", { name: /游戏时光\s*记录平台/ })
    .or(page.getByRole("link", { name: email }));
  const err = page.getByRole("alert");
  try {
    await expect(signedInMarker.first()).toBeVisible({ timeout: 30000 });
  } catch {
    const msg = (await err.textContent().catch(() => "")) || "login failed";
    throw new Error(msg.trim());
  }
  return true;
}
