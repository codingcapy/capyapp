import { test, expect, type Page, type Locator } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { userChats as userChatsTable } from "../schemas/userchats";
import { messages as messagesTable } from "../schemas/messages";
import { reactions as reactionsTable } from "../schemas/reactions";

const USER_A = { email: "test8@t.t", username: "test8", password: "tttttttt" };
const USER_B = { email: "test9@t.t", username: "test9", password: "tttttttt" };
// Any emoji from frontend/src/emojis/emojis.ts works; this one just has to be
// unlikely to collide with a reaction left behind by another test.
const REACTION_EMOJI = "🚀";

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

// Both MessageComponent (own messages) and MessageFriend (others' messages)
// wrap a message in a single `group` div, so the same locator works for
// whichever side is viewing it.
function messageRow(page: Page, content: string) {
  return page.locator("div.group").filter({ hasText: content });
}

// The emoji-picker trigger (a smiley icon) is hidden until the message row
// is hovered (`group-hover:flex`), and it's always the first icon rendered
// in the row's action bar.
async function openEmojiPicker(row: Locator) {
  await row.hover();
  await row.locator("svg").first().click();
}

test("adding a reaction to a message shows up live for the other user over the websocket", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const [userA] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, USER_A.email));
  const [userB] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, USER_B.email));

  // Resolve the shared chat's id directly from the DB.
  const chatIdsA = (
    await db
      .select({ chatId: userChatsTable.chatId })
      .from(userChatsTable)
      .where(eq(userChatsTable.userId, userA.userId))
  ).map((row) => row.chatId);
  const chatIdsB = new Set(
    (
      await db
        .select({ chatId: userChatsTable.chatId })
        .from(userChatsTable)
        .where(eq(userChatsTable.userId, userB.userId))
    ).map((row) => row.chatId),
  );
  const chatId = chatIdsA.find((id) => chatIdsB.has(id));
  if (chatId === undefined) {
    throw new Error(
      `No shared chat found between ${USER_A.email} and ${USER_B.email}`,
    );
  }

  // Use the pre-existing message already sitting in that chat rather than
  // sending a new one.
  const [existingMessage] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId));
  if (!existingMessage) {
    throw new Error(`No existing message found in chat ${chatId}`);
  }

  // Defensively clear out any reaction left behind by a previous failed run
  // before the test starts, so "Reaction already exists" can't false-fail it.
  await db
    .delete(reactionsTable)
    .where(
      and(
        eq(reactionsTable.messageId, existingMessage.messageId),
        eq(reactionsTable.userId, userA.userId),
        eq(reactionsTable.content, REACTION_EMOJI),
      ),
    );

  try {
    await login(pageA, USER_A.email, USER_A.password);
    await login(pageB, USER_B.email, USER_B.password);

    // Both sides open their existing chat with one another so each one's
    // Messages view is mounted and listening for the "reaction" socket event
    await chatListEntry(pageA, USER_B.username).click();
    await chatListEntry(pageB, USER_A.username).click();

    const rowA = messageRow(pageA, existingMessage.content);
    await openEmojiPicker(rowA);

    const [createReactionResponse] = await Promise.all([
      pageA.waitForResponse(
        (res) =>
          res.url().includes("/api/v0/reactions") &&
          res.request().method() === "POST",
      ),
      rowA.getByRole("button", { name: REACTION_EMOJI, exact: true }).click(),
    ]);
    expect(createReactionResponse.ok()).toBeTruthy();

    // test8's own view reflects the new reaction, grouped with a count of 1
    const reactionBadgeA = rowA
      .locator("div.flex.items-center")
      .filter({ hasText: REACTION_EMOJI });
    await expect(reactionBadgeA).toBeVisible();
    await expect(reactionBadgeA.getByText("1", { exact: true })).toBeVisible();

    // test9 (page B) sees the reaction appear on the same message without
    // reloading, via the "reaction" websocket event invalidating their
    // reactions query
    const rowB = messageRow(pageB, existingMessage.content);
    const reactionBadgeB = rowB
      .locator("div.flex.items-center")
      .filter({ hasText: REACTION_EMOJI });
    await expect(reactionBadgeB).toBeVisible({ timeout: 10_000 });
    await expect(reactionBadgeB.getByText("1", { exact: true })).toBeVisible();
  } finally {
    await db
      .delete(reactionsTable)
      .where(
        and(
          eq(reactionsTable.messageId, existingMessage.messageId),
          eq(reactionsTable.userId, userA.userId),
          eq(reactionsTable.content, REACTION_EMOJI),
        ),
      );
    await contextA.close();
    await contextB.close();
  }
});
