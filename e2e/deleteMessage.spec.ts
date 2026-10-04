import { test, expect, type Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { messages as messagesTable } from "../schemas/messages";

const USER_A = { email: "test5@t.t", username: "test5", password: "tttttttt" };
const USER_B = { email: "test6@t.t", username: "test6", password: "tttttttt" };

const DELETED_PLACEHOLDER = "[this message has been deleted]";

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

// Both MessageComponent (own messages) and MessageFriend wrap a message in a
// single `group` div. The message we send in this test is always the most
// recently appended row, so `.last()` keeps referring to the same element
// even after its content is replaced by the deletion placeholder.
function lastMessageRow(page: Page) {
  return page.locator("div.group").last();
}

test("deleting a message replaces its content, hides editing, and blocks further edits", async ({
  browser,
  request,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  let messageId: number | undefined;
  const messageContent = `e2e delete test message ${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

  try {
    await login(pageA, USER_A.email, USER_A.password);
    await login(pageB, USER_B.email, USER_B.password);

    // Both sides open their existing chat so each one's Messages view is
    // mounted and listening for the "message" socket event.
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

    await expect(
      pageA.getByText(messageContent, { exact: true }),
    ).toBeVisible();
    await expect(
      pageB.getByText(messageContent, { exact: true }),
    ).toBeVisible();

    const rowA = lastMessageRow(pageA);
    await expect(rowA).toContainText(messageContent);

    // Sanity check: before deletion the owner's context menu offers Edit.
    await rowA.click({ button: "right" });
    await expect(pageA.getByRole("button", { name: "Edit" })).toBeVisible();

    // Delete the message via the context menu's confirm dialog.
    await pageA.getByRole("button", { name: "Delete", exact: true }).click();
    const [deleteMessageResponse] = await Promise.all([
      pageA.waitForResponse(
        (res) =>
          res.url().includes("/api/v0/messages/delete") &&
          res.request().method() === "POST",
      ),
      pageA.getByRole("button", { name: "Delete", exact: true }).click(),
    ]);
    expect(deleteMessageResponse.ok()).toBeTruthy();

    // Owner's own view reflects the deletion placeholder in place of the
    // original content.
    await expect(rowA).toContainText(DELETED_PLACEHOLDER);
    await expect(rowA).not.toContainText(messageContent);

    // test6 (page B) sees the same placeholder without reloading, via the
    // "message" websocket event invalidating their messages query.
    const rowB = lastMessageRow(pageB);
    await expect(rowB).toContainText(DELETED_PLACEHOLDER, { timeout: 10_000 });

    // The context menu no longer offers Edit for a deleted message.
    await rowA.click({ button: "right" });
    await expect(pageA.getByRole("button", { name: "Edit" })).toHaveCount(0);
    // Close the context menu by clicking elsewhere before moving on.
    await messageInputA.click();

    // Backend enforcement: even a direct API call can't change the content
    // of a deleted message.
    const loginResponse = await request.post("/api/v0/user/login", {
      data: { email: USER_A.email, password: USER_A.password },
    });
    const { result } = await loginResponse.json();
    const accessToken = result.accessToken as string;
    expect(accessToken).toBeTruthy();

    const updateResponse = await request.post("/api/v0/messages/update", {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { messageId, content: "this should not be allowed" },
    });
    expect(updateResponse.status()).toBe(403);

    const [messageRow] = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageId, messageId));
    expect(messageRow?.content).toBe(DELETED_PLACEHOLDER);
    expect(messageRow?.status).toBe("deleted");
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
