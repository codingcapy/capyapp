// e2e/chat.spec.ts

import { test, expect } from "@playwright/test";

test("application loads", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/CapyApp/i);
});
