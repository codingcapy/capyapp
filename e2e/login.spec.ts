import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveTitle(/CapyApp/i);

  page.on("response", async (response) => {
    if (response.url().includes("/api/v0/user/login")) {
      try {
      } catch {
        // Ignore response parsing errors
      }
    }
  });

  await page.locator("#email").fill("test1@t.t");
  await page.locator("#password").fill("tttttttt");

  await page.getByRole("button", { name: "LOGIN" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});
