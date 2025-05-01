import { Hono } from "hono";
import { messages as messagesTable } from "../schemas/messages";
import { messageReads as messageReadsTable } from "../schemas/messagereads";
import { userChats as userChatsTable } from "../schemas/userchats";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { mightFail, mightFailSync } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import z from "zod";

export function assertIsParsableInt(id: string): number {
  const { result: parsedId, error: parseIdError } = mightFailSync(() =>
    z.coerce.number().int().parse(id)
  );

  if (parseIdError) {
    throw new HTTPException(400, {
      message: `Id ${id} cannot be parsed into a number.`,
      cause: parseIdError,
    });
  }

  return parsedId;
}

export const messagesRouter = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        messageId: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: messageInsertError, result: messageInsertResult } =
        await mightFail(
          db
            .insert(messagesTable)
            .values({ ...insertValues })
            .returning()
        );
      if (messageInsertError) {
        console.log("Error while creating message:", messageInsertResult);
        throw new HTTPException(500, {
          message: "Error while creating message",
          cause: messageInsertResult,
        });
      }
      return c.json({ message: messageInsertResult[0] }, 200);
    }
  )
  .get("/:chatId", async (c) => {
    const { chatId: chatIdString } = c.req.param();
    const chatId = assertIsParsableInt(chatIdString);
    const limit = Number(c.req.query("limit") || 100); // Default to 100 messages
    const cursor = Number(c.req.query("cursor") || 0); // Cursor for pagination
    if (!chatId) {
      return c.json({ error: "chatId parameter is required." }, 400);
    }
    const { result: messagesQueryResult, error: messagesQueryError } =
      await mightFail(
        db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.chatId, chatId))
          .orderBy(desc(messagesTable.createdAt)) // Order by newest first
          .limit(limit)
          .offset(cursor) // Offset for pagination
      );
    if (messagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching messages.",
        cause: messagesQueryError,
      });
    }
    return c.json({ messages: messagesQueryResult });
  })
  .get(async (c) => {
    const { result: messagesQueryResult, error: messagesQueryError } =
      await mightFail(db.select().from(messagesTable));
    if (messagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching messages.",
        cause: messagesQueryError,
      });
    }
    return c.json({ messages: messagesQueryResult });
  })
  .post(
    "/delete",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        chatId: true,
        userId: true,
        content: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const deleteValues = c.req.valid("json");
      const { error: messageDeleteError, result: messageDeleteResult } =
        await mightFail(
          db
            .update(messagesTable)
            .set({ content: "[this message has been deleted]" })
            .where(eq(messagesTable.messageId, Number(deleteValues.messageId)))
            .returning()
        );
      if (messageDeleteError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: messageDeleteResult,
        });
      }
      return c.json({ newMessage: messageDeleteResult[0] }, 200);
    }
  )
  .post(
    "/update",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        chatId: true,
        userId: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: messageUpdateError, result: messageUpdateResult } =
        await mightFail(
          db
            .update(messagesTable)
            .set({ content: updateValues.content })
            .where(eq(messagesTable.messageId, Number(updateValues.messageId)))
            .returning()
        );
      if (messageUpdateError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: messageUpdateResult,
        });
      }
      return c.json({ newMessage: messageUpdateResult[0] }, 200);
    }
  )
  .get("/unreads/:userId", async (c) => {
    const userId = c.req.param("userId");
    if (!userId) {
      return c.json({ error: "userId parameter is required." }, 400);
    }
    const { result: userChatsQueryResult, error: userChatsQueryError } =
      await mightFail(
        db
          .select({ chatId: userChatsTable.chatId })
          .from(userChatsTable)
          .where(eq(userChatsTable.userId, userId))
      );
    if (userChatsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching userchats.",
        cause: userChatsQueryError,
      });
    }
    const chatIds = userChatsQueryResult.map((row) => row.chatId);
    if (chatIds.length === 0) {
      return c.json({ messages: [] });
    }
    const {
      result: unreadMessagesQueryResult,
      error: unreadMessagesQueryError,
    } = await mightFail(
      db
        .select({
          messageId: messagesTable.messageId,
          chatId: messagesTable.chatId,
          userId: messagesTable.userId,
          content: messagesTable.content,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .leftJoin(
          messageReadsTable,
          and(
            eq(messagesTable.messageId, messageReadsTable.messageId),
            eq(messageReadsTable.userId, userId)
          )
        )
        .where(
          and(
            inArray(messagesTable.chatId, chatIds),
            isNull(messageReadsTable.messageId),
            ne(messagesTable.userId, userId)
          )
        )
    );
    if (unreadMessagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching unreads.",
        cause: unreadMessagesQueryError,
      });
    }
    return c.json({ messages: unreadMessagesQueryResult });
  })
  .get("/unreads", async (c) => {
    const { result: userChatsQueryResult, error: userChatsQueryError } =
      await mightFail(
        db.select({ chatId: userChatsTable.chatId }).from(userChatsTable)
      );
    if (userChatsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching userchats.",
        cause: userChatsQueryError,
      });
    }
    const chatIds = userChatsQueryResult.map((row) => row.chatId);
    if (chatIds.length === 0) {
      return c.json({ messages: [] });
    }
    const {
      result: unreadMessagesQueryResult,
      error: unreadMessagesQueryError,
    } = await mightFail(
      db
        .select({
          messageId: messagesTable.messageId,
          chatId: messagesTable.chatId,
          userId: messagesTable.userId,
          content: messagesTable.content,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .leftJoin(
          messageReadsTable,
          and(eq(messagesTable.messageId, messageReadsTable.messageId))
        )
        .where(
          and(
            inArray(messagesTable.chatId, chatIds),
            isNull(messageReadsTable.messageId)
          )
        )
    );
    if (unreadMessagesQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching unreads.",
        cause: unreadMessagesQueryError,
      });
    }
    return c.json({ messages: unreadMessagesQueryResult });
  });
