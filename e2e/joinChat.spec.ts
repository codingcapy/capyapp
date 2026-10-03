import { test, expect, type Page } from "@playwright/test";
import { and, eq, or } from "drizzle-orm";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { userChats as userChatsTable } from "../schemas/userchats";
import { messages as messagesTable } from "../schemas/messages";
import { chats as chatsTable } from "../schemas/chats";

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

test("inviting a friend to a 1:1 chat forks a new chat room instead of exposing the original history", async ({
  browser,
}) => {
  const contextHost = await browser.newContext();
  const contextExisting = await browser.newContext();
  const contextInvitee = await browser.newContext();
  const pageHost = await contextHost.newPage();
  const pageExisting = await contextExisting.newPage();
  const pageInvitee = await contextInvitee.newPage();
  let forkedChatId: number | undefined;

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

  // Resolve the shared (1:1) chat's id directly from the DB.
  const [hostUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, HOST.email));
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, EXISTING_PARTICIPANT.email));
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
  const originalChatId = hostChatIds.find((id) => existingChatIds.has(id));
  if (originalChatId === undefined) {
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

    // Host and the existing participant both open their shared 1:1 chat so
    // the existing participant's view is mounted and listening for socket
    // events on it.
    await chatListEntry(pageHost, EXISTING_PARTICIPANT.username).click();
    await chatListEntry(pageExisting, HOST.username).click();

    await pageHost.getByText("+ Invite a friend").click();
    await pageHost.locator('input[name="email"]').fill(INVITEE.email);
    const [addFriendResponse] = await Promise.all([
      pageHost.waitForResponse(
        (res) =>
          res.url().includes("/api/v0/chats/add") &&
          res.request().method() === "POST",
      ),
      pageHost.getByRole("button", { name: "Add friend" }).click(),
    ]);
    const { chat: forkedChat } = await addFriendResponse.json();
    expect(forkedChat).toBeTruthy();
    forkedChatId = forkedChat.chatId as number;
    expect(forkedChatId).not.toBe(originalChatId);

    // The original 1:1 chat is protected: its participants stay exactly the
    // host and the existing participant, and the invitee never shows up in
    // its participants panel.
    await expect(
      participantsPanelEntry(pageExisting, INVITEE.username),
    ).toBeHidden();

    // The host's own view is switched straight over to the newly forked
    // chat, which now shows the other two participants in its title.
    await expect(
      chatTitleHeader(pageHost, EXISTING_PARTICIPANT.username),
    ).toBeVisible({ timeout: 10_000 });
    await expect(chatTitleHeader(pageHost, INVITEE.username)).toBeVisible({
      timeout: 10_000,
    });

    // The existing participant (not the one performing the invite) sees a
    // brand-new chat appear in their sidebar — not a change to the original
    // chat — purely via the "chat" websocket event.
    await expect(
      chatListEntry(pageExisting, INVITEE.username),
    ).toBeVisible({ timeout: 10_000 });

    // The invitee sees the new chat appear in their own sidebar without
    // reloading, via the "chat" websocket event
    await expect(chatListEntry(pageInvitee, HOST.username)).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    if (forkedChatId !== undefined) {
      await db
        .delete(messagesTable)
        .where(eq(messagesTable.chatId, forkedChatId));
      await db
        .delete(userChatsTable)
        .where(eq(userChatsTable.chatId, forkedChatId));
      await db.delete(chatsTable).where(eq(chatsTable.chatId, forkedChatId));
    }
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
