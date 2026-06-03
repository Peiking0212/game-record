import type { Page } from "@playwright/test";
import { getTestCredentials } from "./load-env";

export async function loginAsTestUser(page: Page): Promise<boolean> {
  const { email, password } = getTestCredentials();
  if (!email || !password) return false;

  await page.goto("/auth");
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill(password);
  await page.getByTestId("auth-submit").click();
  const home = page.getByRole("heading", { name: /欢迎来到我的游戏世界/ });
  const err = page.getByRole("alert");
  try {
    await home.waitFor({ state: "visible", timeout: 30000 });
  } catch {
    const msg = (await err.textContent().catch(() => "")) || "login failed";
    throw new Error(msg.trim());
  }
  return true;
}
