import { test, expect, type Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { userChats as userChatsTable } from "../schemas/userchats";
import { messages as messagesTable } from "../schemas/messages";

const HOST = { email: "test5@t.t", username: "test5", password: "tttttttt" };
const EXISTING_PARTICIPANT = {
  email: "test6@t.t",
  username: "test6",
  password: "tttttttt",
};
// test5/test6 already share a chat; any other seed user works as the
// temporary third participant who leaves.
const LEAVER = { email: "test2@t.t", username: "test2", password: "tttttttt" };

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

// These usernames also show up in the friend list / friend profile header /
// participants list, so each helper pins down one specific element by its
// exact class combination instead of matching on text alone.
function chatListEntry(page: Page, username: string) {
  return page.locator('div[class="ml-2 py-2 truncate"]', { hasText: username });
}

function chatTitleHeader(page: Page, username: string) {
  return page.locator('div[class="ml-2 text-xl"]', { hasText: username });
}

function participantsPanelEntry(page: Page, username: string) {
  return page
    .locator('div[class="pl-[30px] pt-[20px] relative"]')
    .getByText(username, { exact: true });
}

test("leaving a chat updates the remaining participants and title live over the websocket", async ({
  browser,
}) => {
  const contextHost = await browser.newContext();
  const contextExisting = await browser.newContext();
  const contextLeaver = await browser.newContext();
  const pageHost = await contextHost.newPage();
  const pageExisting = await contextExisting.newPage();
  const pageLeaver = await contextLeaver.newPage();

  const [hostUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, HOST.email));
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, EXISTING_PARTICIPANT.email));
  const [leaverUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, LEAVER.email));

  // Resolve the shared chat's id directly from the DB.
  const hostChatIds = (
    await db
      .select({ chatId: userChatsTable.chatId })
      .from(userChatsTable)
      .where(eq(userChatsTable.userId, hostUser.userId))
  ).map((row) => row.chatId);
  const existingChatIds = new Set(
    (
      await db
        .select({ chatId: userChatsTable.chatId })
        .from(userChatsTable)
        .where(eq(userChatsTable.userId, existingUser.userId))
    ).map((row) => row.chatId),
  );
  const chatId = hostChatIds.find((id) => existingChatIds.has(id));
  if (chatId === undefined) {
    throw new Error(
      `No shared chat found between ${HOST.email} and ${EXISTING_PARTICIPANT.email}`,
    );
  }

  // Add the leaver as a third participant directly — the invite flow itself
  // is covered by joinChat.spec.ts, so this test can focus on leaving.
  await db
    .insert(userChatsTable)
    .values({ userId: leaverUser.userId, chatId })
    .onConflictDoNothing();

  try {
    await login(pageHost, HOST.email, HOST.password);
    await login(
      pageExisting,
      EXISTING_PARTICIPANT.email,
      EXISTING_PARTICIPANT.password,
    );
    await login(pageLeaver, LEAVER.email, LEAVER.password);

    // The existing participant opens the chat so their view is mounted and
    // listening for "chatUpdate"; the leaver opens it too so they can leave
    await chatListEntry(pageExisting, HOST.username).click();
    await chatListEntry(pageLeaver, HOST.username).click();

    await expect(
      participantsPanelEntry(pageExisting, LEAVER.username),
    ).toBeVisible();

    // Open the chat header's "..." menu and leave via the confirmation modal
    await pageLeaver.locator('svg[class="mt-1"]').click();
    await pageLeaver.getByText("Leave chat", { exact: true }).click();
    await pageLeaver.getByRole("button", { name: "Leave" }).click();

    // The remaining participant sees the leaver disappear from the
    // participants list and the (now two-person) title update live, purely
    // via the "chatUpdate" websocket event invalidating their participants
    // query. A longer timeout absorbs socket/query-invalidation latency.
    await expect(
      participantsPanelEntry(pageExisting, LEAVER.username),
    ).toBeHidden({ timeout: 10_000 });
    await expect(chatTitleHeader(pageExisting, LEAVER.username)).toBeHidden({
      timeout: 10_000,
    });

    // The leaver's own chat list no longer shows the chat they left
    await expect(chatListEntry(pageLeaver, HOST.username)).toBeHidden();
  } finally {
    await db
      .delete(messagesTable)
      .where(
        and(
          eq(messagesTable.chatId, chatId),
          eq(messagesTable.userId, "notification"),
          eq(messagesTable.content, `${LEAVER.username} has left the chat`),
        ),
      );
    await db
      .delete(userChatsTable)
      .where(
        and(
          eq(userChatsTable.chatId, chatId),
          eq(userChatsTable.userId, leaverUser.userId),
        ),
      );
    await contextHost.close();
    await contextExisting.close();
    await contextLeaver.close();
  }
});
