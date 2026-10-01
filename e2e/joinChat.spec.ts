import { test, expect, type Page } from "@playwright/test";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { userChats as userChatsTable } from "../schemas/userchats";
import { messages as messagesTable } from "../schemas/messages";

const HOST = { email: "test5@t.t", username: "test5", password: "tttttttt" };
const EXISTING_PARTICIPANT = {
  email: "test6@t.t",
  username: "test6",
  password: "tttttttt",
};
// test5/test6 already share a chat; any other seed user works as the invitee.
const INVITEE = { email: "test1@t.t", username: "test1", password: "tttttttt" };

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

test("inviting a friend to a chat updates participants and the empty title live over the websocket", async ({
  browser,
}) => {
  const contextHost = await browser.newContext();
  const contextExisting = await browser.newContext();
  const contextInvitee = await browser.newContext();
  const pageHost = await contextHost.newPage();
  const pageExisting = await contextExisting.newPage();
  const pageInvitee = await contextInvitee.newPage();

  // The invite form only lets the host pick from their own friends, so make
  // sure the host and invitee are friends; only tear this down afterwards if
  // this test is the one that created it.
  const existingFriendship = await db
    .select()
    .from(userFriendsTable)
    .where(
      and(
        eq(userFriendsTable.userEmail, HOST.email),
        eq(userFriendsTable.friendEmail, INVITEE.email),
      ),
    );
  const createdFriendship = existingFriendship.length === 0;
  if (createdFriendship) {
    await db
      .insert(userFriendsTable)
      .values([
        { userEmail: HOST.email, friendEmail: INVITEE.email },
        { userEmail: INVITEE.email, friendEmail: HOST.email },
      ])
      .onConflictDoNothing();
  }

  // Resolve the shared chat's id directly from the DB (rather than off the
  // invite response) so cleanup doesn't depend on reading the fetch body.
  const [hostUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, HOST.email));
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, EXISTING_PARTICIPANT.email));
  const [inviteeUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, INVITEE.email));
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

  try {
    await login(pageHost, HOST.email, HOST.password);
    await login(
      pageExisting,
      EXISTING_PARTICIPANT.email,
      EXISTING_PARTICIPANT.password,
    );
    await login(pageInvitee, INVITEE.email, INVITEE.password);

    // Host and the existing participant both open their shared chat so the
    // existing participant's view is mounted and listening for "chatUpdate"
    await chatListEntry(pageHost, EXISTING_PARTICIPANT.username).click();
    await chatListEntry(pageExisting, HOST.username).click();

    await pageHost.getByText("+ Invite a friend").click();
    await pageHost.locator('input[name="email"]').fill(INVITEE.email);
    await pageHost.getByRole("button", { name: "Add friend" }).click();

    // The existing participant (not the one performing the invite) sees the
    // new participant, and the previously-empty title updates to include
    // them, purely via the "chatUpdate" websocket event invalidating their
    // participants query. A longer timeout absorbs socket/query-invalidation
    // latency when the whole suite is running under load.
    await expect(
      participantsPanelEntry(pageExisting, INVITEE.username),
    ).toBeVisible({ timeout: 10_000 });
    await expect(chatTitleHeader(pageExisting, INVITEE.username)).toBeVisible({
      timeout: 10_000,
    });

    // The invitee sees the new chat appear in their own sidebar without
    // reloading, via the "chat" websocket event
    await expect(chatListEntry(pageInvitee, HOST.username)).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    await db
      .delete(messagesTable)
      .where(
        and(
          eq(messagesTable.chatId, chatId),
          eq(messagesTable.userId, "notification"),
          eq(messagesTable.content, `${INVITEE.username} has entered the chat`),
        ),
      );
    await db
      .delete(userChatsTable)
      .where(
        and(
          eq(userChatsTable.chatId, chatId),
          eq(userChatsTable.userId, inviteeUser.userId),
        ),
      );
    if (createdFriendship) {
      await db
        .delete(userFriendsTable)
        .where(
          or(
            and(
              eq(userFriendsTable.userEmail, HOST.email),
              eq(userFriendsTable.friendEmail, INVITEE.email),
            ),
            and(
              eq(userFriendsTable.userEmail, INVITEE.email),
              eq(userFriendsTable.friendEmail, HOST.email),
            ),
          ),
        );
    }
    await contextHost.close();
    await contextExisting.close();
    await contextInvitee.close();
  }
});
