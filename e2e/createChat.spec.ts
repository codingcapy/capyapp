import { test, expect, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { chats as chatsTable } from "../schemas/chats";
import { userChats as userChatsTable } from "../schemas/userchats";

const USER_A = { email: "test3@t.t", username: "test3", password: "tttttttt" };
const USER_B = { email: "test4@t.t", username: "test4", password: "tttttttt" };

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// The friend's username shows up in several places (friend list, friend
// profile header, chat list), so these pin down the exact element instead of
// matching on text alone.
function friendListEntry(page: Page, username: string) {
  return page.locator('div[class="ml-2 py-2"]', { hasText: username });
}

function chatListEntry(page: Page, username: string) {
  return page.locator('div[class="ml-2 py-2 truncate"]', { hasText: username });
}

test("creating a chat room shows up live for the other user over the websocket", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  let chatId: number | undefined;

  try {
    await login(pageA, USER_A.email, USER_A.password);
    await login(pageB, USER_B.email, USER_B.password);

    // test3 (page A) opens test4's friend profile and starts a chat
    await friendListEntry(pageA, USER_B.username).click();

    const [createChatResponse] = await Promise.all([
      pageA.waitForResponse(
        (res) =>
          res.url().includes("/api/v0/chats") &&
          res.request().method() === "POST",
      ),
      pageA.getByRole("button", { name: "Start chat" }).click(),
    ]);
    const { user: createdUserChat } = await createChatResponse.json();
    chatId = createdUserChat.chatId as number;

    // test3's own chat list reflects the new chat
    await expect(chatListEntry(pageA, USER_B.username)).toBeVisible();

    // test4 (page B) sees the new chat appear without reloading, via the
    // "chat" websocket event invalidating their chats query
    await expect(chatListEntry(pageB, USER_A.username)).toBeVisible();
  } finally {
    if (chatId !== undefined) {
      await db.delete(userChatsTable).where(eq(userChatsTable.chatId, chatId));
      await db.delete(chatsTable).where(eq(chatsTable.chatId, chatId));
    }
    await contextA.close();
    await contextB.close();
  }
});
