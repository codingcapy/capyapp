import { zValidator } from "@hono/zod-validator";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userChats as userChatsTable } from "../schemas/userchats";
import { messages as messagesTable } from "../schemas/messages";
import { users as usersTable } from "../schemas/users";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { chats as chatsTable } from "../schemas/chats";
import { z } from "zod";
import { requireUser } from "./utils";

const createChatSchema = z.object({
  title: z.string(),
  userId: z.string(),
  friendId: z.string(),
});

const addFriendSchema = z.object({
  email: z.string(),
  chatId: z.number(),
});

export const userChatsRouter = new Hono()
  .post("/", zValidator("json", createChatSchema), async (c) => {
    const decodedUser = requireUser(c);
    const insertValues = c.req.valid("json");
    if (decodedUser.id !== insertValues.userId) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    const { error: chatInsertError, result: chatInsertResult } =
      await mightFail(
        db.insert(chatsTable).values({ title: insertValues.title }).returning(),
      );
    if (chatInsertError) {
      console.log("Error while creating chat");
      throw new HTTPException(500, {
        message: "Error while creating chat",
        cause: chatInsertResult,
      });
    }
    const { error: userChatInsertError, result: userChatInsertResult } =
      await mightFail(
        db
          .insert(userChatsTable)
          .values({
            userId: insertValues.userId,
            chatId: chatInsertResult[0].chatId,
          })
          .returning(),
      );
    if (userChatInsertError) {
      console.log("Error while creating user chat for user");
      throw new HTTPException(500, {
        message: "Error while creating user chat",
        cause: userChatInsertError,
      });
    }
    const { error: userChatInsertError2, result: userChatInsertResult2 } =
      await mightFail(
        db
          .insert(userChatsTable)
          .values({
            userId: insertValues.friendId,
            chatId: chatInsertResult[0].chatId,
          })
          .returning(),
      );
    if (userChatInsertError2) {
      console.log("Error while creating user chat for friend");
      throw new HTTPException(500, {
        message: "Error while creating user chat",
        cause: userChatInsertError2,
      });
    }
    return c.json({ user: userChatInsertResult[0] }, 200);
  })
  .get("/:userId", async (c) => {
    requireUser(c);
    const userId = c.req.param("userId");
    if (!userId) {
      return c.json({ error: "userId parameter is required." }, 400);
    }
    const { result: chatsQueryResult, error: chatsQueryError } =
      await mightFail(
        db
          .select({
            chatId: chatsTable.chatId,
            title: chatsTable.title,
            createdAt: chatsTable.createdAt,
          })
          .from(userChatsTable)
          .innerJoin(chatsTable, eq(userChatsTable.chatId, chatsTable.chatId))
          .where(eq(userChatsTable.userId, userId)),
      );
    if (chatsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user chats.",
        cause: chatsQueryError,
      });
    }
    return c.json({ chats: chatsQueryResult });
  })
  .post("/add", zValidator("json", addFriendSchema), async (c) => {
    requireUser(c);
    const insertValues = c.req.valid("json");
    const { error: userQueryError, result: userQueryResult } = await mightFail(
      db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, insertValues.email)),
    );
    if (userQueryError) {
      throw new HTTPException(500, {
        message: "Error while fetching users",
        cause: userQueryError,
      });
    }
    if (userQueryResult.length < 1)
      return c.json({ message: "Error adding friend" }, 500);

    // onConflictDoNothing: if this user previously left this chat and is
    // rejoining, a stale row here would otherwise 500 on the unique
    // (userId, chatId) constraint. Safe no-op on a genuine re-invite too.
    const { error: userChatInsertError, result: userChatInsertResult } =
      await mightFail(
        db
          .insert(userChatsTable)
          .values({
            userId: userQueryResult[0].userId,
            chatId: Number(insertValues.chatId),
          })
          .onConflictDoNothing()
          .returning(),
      );
    if (userChatInsertError) {
      console.log("Error while creating user chat for user");
      throw new HTTPException(500, {
        message: "Error while creating user chat",
        cause: userChatInsertError,
      });
    }

    const { error: lastMessageQueryError, result: lastMessageQueryResult } =
      await mightFail(
        db
          .select({ messageId: messagesTable.messageId })
          .from(messagesTable)
          .where(eq(messagesTable.chatId, Number(insertValues.chatId)))
          .orderBy(desc(messagesTable.messageId))
          .limit(1),
      );
    if (lastMessageQueryError) {
      console.log("Error while fetching last message");
      throw new HTTPException(500, {
        message: "Error while fetching last message",
        cause: lastMessageQueryError,
      });
    }
    const lastReadMessageId =
      lastMessageQueryResult.length > 0
        ? lastMessageQueryResult[0].messageId
        : null;

    // Seed the new participant's read pointer to the chat's current last
    // message so pre-existing history isn't counted as unread. This has to
    // land on userChatsTable itself — that's the table /unreads reads from.
    const { error: userChatReadPointerError } = await mightFail(
      db
        .update(userChatsTable)
        .set({ lastReadMessageId, lastReadAt: new Date() })
        .where(
          and(
            eq(userChatsTable.userId, userQueryResult[0].userId),
            eq(userChatsTable.chatId, Number(insertValues.chatId)),
          ),
        ),
    );
    if (userChatReadPointerError) {
      console.log("Error while seeding user chat read pointer");
      throw new HTTPException(500, {
        message: "Error while seeding user chat read pointer",
        cause: userChatReadPointerError,
      });
    }

    const { error: messageInsertError, result: messageInsertResult } =
      await mightFail(
        db
          .insert(messagesTable)
          .values({
            userId: "notification",
            chatId: Number(insertValues.chatId),
            content: userQueryResult[0].username + " has entered the chat",
          })
          .returning(),
      );
    if (messageInsertError) {
      console.log("Error while creating chat");
      throw new HTTPException(500, {
        message: "Error while creating chat",
        cause: messageInsertResult,
      });
    }

    return c.json({ user: userChatInsertResult[0] }, 200);
  })
  .post(
    "/update",
    zValidator("json", createInsertSchema(chatsTable)),
    async (c) => {
      requireUser(c);
      const insertValues = c.req.valid("json");
      if (insertValues.chatId === undefined) {
        throw new HTTPException(400, { message: "chatId is required" });
      }
      const { error: updateChatError, result: updateChatResult } =
        await mightFail(
          db
            .update(chatsTable)
            .set({ title: insertValues.title })
            .where(eq(chatsTable.chatId, insertValues.chatId))
            .returning(),
        );
      if (updateChatError) {
        throw new HTTPException(500, {
          message: "Error updating chat title",
          cause: updateChatError,
        });
      }
      return c.json({ newChat: updateChatResult[0] }, 200);
    },
  )
  .get("/participants/:chatId", async (c) => {
    requireUser(c);
    const chatId = c.req.param("chatId");
    if (!chatId) {
      return c.json({ error: "chatId parameter is required." }, 400);
    }
    const { result: participantsQueryResult, error: participantsQueryError } =
      await mightFail(
        db
          .select({
            userId: usersTable.userId,
            email: usersTable.email,
            username: usersTable.username,
            profilePic: usersTable.profilePic,
            status: usersTable.status,
            createdAt: usersTable.createdAt,
          })
          .from(userChatsTable)
          .innerJoin(usersTable, eq(userChatsTable.userId, usersTable.userId))
          .where(eq(userChatsTable.chatId, Number(chatId))),
      );
    if (participantsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching participants",
        cause: participantsQueryError,
      });
    }
    return c.json({ participants: participantsQueryResult });
  })
  .post(
    "/leave",
    zValidator(
      "json",
      createInsertSchema(userChatsTable).omit({
        createdAt: true,
        userChatId: true,
      }),
    ),
    async (c) => {
      const decodedUser = requireUser(c);
      const insertValues = c.req.valid("json");
      if (decodedUser.id !== insertValues.userId) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      const { result: leaveChatQueryResult, error: leaveChatQueryError } =
        await mightFail(
          db
            .delete(userChatsTable)
            .where(
              and(
                eq(userChatsTable.userId, insertValues.userId),
                eq(userChatsTable.chatId, insertValues.chatId),
              ),
            ),
        );
      if (leaveChatQueryError) {
        throw new HTTPException(500, {
          message: "Error occurred when leaving chat",
          cause: leaveChatQueryError,
        });
      }

      return c.json({ participants: leaveChatQueryResult });
    },
  )
  .get("/unreads/:userId", async (c) => {
    requireUser(c);
    const userId = c.req.param("userId");
    if (!userId) {
      return c.json({ error: "userId parameter is required." }, 400);
    }
    const { result: unreadsResult, error: unreadsError } = await mightFail(
      db
        .select({
          chatId: userChatsTable.chatId,
          unreadCount: sql<number>`COUNT(CASE WHEN ${messagesTable.messageId} > COALESCE(${userChatsTable.lastReadMessageId}, 0) AND ${messagesTable.userId} != ${userId} THEN 1 END)`,
        })
        .from(userChatsTable)
        .leftJoin(
          messagesTable,
          eq(messagesTable.chatId, userChatsTable.chatId),
        )
        .where(eq(userChatsTable.userId, userId))
        .groupBy(userChatsTable.chatId),
    );
    if (unreadsError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching unread counts.",
        cause: unreadsError,
      });
    }
    const unreads = unreadsResult.map((row) => ({
      chatId: row.chatId,
      unreadCount: Number(row.unreadCount) || 0,
    }));
    return c.json({ unreads });
  });
