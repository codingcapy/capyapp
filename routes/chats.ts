import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userChats as userChatsTable } from "../schemas/userchats";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { chats as chatsTable } from "../schemas/chats";
import { z } from "zod";

const createChatSchema = z.object({
  title: z.string(),
  userId: z.string(),
  friendId: z.string(),
});

export const userChatsRouter = new Hono()
  .post("/", zValidator("json", createChatSchema), async (c) => {
    const insertValues = c.req.valid("json");
    const { error: chatInsertError, result: chatInsertResult } =
      await mightFail(
        db.insert(chatsTable).values({ title: insertValues.title }).returning()
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
          .returning()
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
          .returning()
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
          .where(eq(userChatsTable.userId, userId))
      );
    if (chatsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user chats.",
        cause: chatsQueryError,
      });
    }
    return c.json({ chats: chatsQueryResult });
  });
