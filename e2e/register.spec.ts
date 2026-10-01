import { test, expect } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";

test("user can sign up", async ({ page }) => {
  const uniqueId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const username = `testuser${uniqueId}`;
  const email = `test-${uniqueId}@t.t`;
  const password = "tttttttt";

  try {
    await page.goto("/signup");
    await expect(page).toHaveTitle(/CapyApp/i);

    await page.locator("#username").fill(username);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    await page.getByRole("button", { name: "SIGNUP" }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    // Remove the user created by this test so repeated runs don't collide on the unique email.
    await db.delete(usersTable).where(eq(usersTable.email, email));
  }
});
