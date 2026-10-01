import { test, expect, type Page } from "@playwright/test";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { userFriends as userFriendsTable } from "../schemas/userfriends";

const USER_A = { email: "test1@t.t", username: "test1", password: "tttttttt" };
const USER_B = { email: "test2@t.t", username: "test2", password: "tttttttt" };

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("adding a friend shows up live for the other user over the websocket", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await login(pageA, USER_A.email, USER_A.password);
    await login(pageB, USER_B.email, USER_B.password);

    // test1 (page A) adds test2 as a friend
    await pageA.getByText("+ Add a friend").click();
    await pageA.locator("#email").fill(USER_B.email);
    await pageA.getByRole("button", { name: "Add" }).click();

    await expect(pageA.getByText("Friend added successfully!")).toBeVisible();

    // test1's own friend list reflects the addition
    await expect(
      pageA.getByText(USER_B.username, { exact: true }),
    ).toBeVisible();

    // test2 (page B) sees the new friend appear without reloading, via the
    // "friend" websocket event invalidating their friends query
    await expect(
      pageB.getByText(USER_A.username, { exact: true }),
    ).toBeVisible();
  } finally {
    // Remove the bidirectional friend rows created by this test
    await db
      .delete(userFriendsTable)
      .where(
        or(
          and(
            eq(userFriendsTable.userEmail, USER_A.email),
            eq(userFriendsTable.friendEmail, USER_B.email),
          ),
          and(
            eq(userFriendsTable.userEmail, USER_B.email),
            eq(userFriendsTable.friendEmail, USER_A.email),
          ),
        ),
      );
    await contextA.close();
    await contextB.close();
  }
});
