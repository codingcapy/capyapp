import { test, expect, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { messages as messagesTable } from "../schemas/messages";

const USER_A = { email: "test5@t.t", username: "test5", password: "tttttttt" };
const USER_B = { email: "test6@t.t", username: "test6", password: "tttttttt" };

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// The chat partner's username also shows up in the friend list / friend
// profile header, so this pins down the chat-list-item element specifically.
function chatListEntry(page: Page, username: string) {
  return page.locator('div[class="ml-2 py-2 truncate"]', { hasText: username });
}

test("sending a message shows up live for the other user over the websocket", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  let messageId: number | undefined;
  const messageContent = `e2e test message ${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

  try {
    await login(pageA, USER_A.email, USER_A.password);
    await login(pageB, USER_B.email, USER_B.password);

    // Both sides open their existing chat with one another so each one's
    // Messages view is mounted and listening for the "message" socket event
    await chatListEntry(pageA, USER_B.username).click();
    await chatListEntry(pageB, USER_A.username).click();

    const messageInputA = pageA.locator('input[name="messagecontent"]');
    const [createMessageResponse] = await Promise.all([
      pageA.waitForResponse(
        (res) =>
          res.url().includes("/api/v0/messages") &&
          res.request().method() === "POST",
      ),
      (async () => {
        await messageInputA.fill(messageContent);
        await messageInputA.press("Enter");
      })(),
    ]);
    const { message: createdMessage } = await createMessageResponse.json();
    messageId = createdMessage.messageId as number;

    // test5's own view reflects the sent message
    await expect(
      pageA.getByText(messageContent, { exact: true }),
    ).toBeVisible();

    // test6 (page B) sees the message appear without reloading, via the
    // "message" websocket event
    await expect(
      pageB.getByText(messageContent, { exact: true }),
    ).toBeVisible();
  } finally {
    if (messageId !== undefined) {
      await db
        .delete(messagesTable)
        .where(eq(messagesTable.messageId, messageId));
    }
    await contextA.close();
    await contextB.close();
  }
});
