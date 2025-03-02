import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userChats as userChatsTable } from "../schemas/userchats";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { chats as chatsTable } from "../schemas/chats";

export const userChatsRouter = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      createInsertSchema(userChatsTable).omit({
        userChatId: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: userChatInsertError, result: userChatInsertResult } =
        await mightFail(
          db
            .insert(userChatsTable)
            .values({ ...insertValues })
            .returning()
        );
      if (userChatInsertError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: userChatInsertResult,
        });
      }
      return c.json({ user: userChatInsertResult[0] }, 200);
    }
  )
  .get("/:userId", async (c) => {
    const userIdString = c.req.param("userId");
    if (!userIdString) {
      return c.json({ error: "userId parameter is required." }, 400);
    }
    const { result: userChatsQueryResult, error: userChatsQueryError } =
      await mightFail(
        db
          .select({
            chatId: chatsTable.chatId,
            title: chatsTable.title,
            createdAt: chatsTable.createdAt,
          })
          .from(userChatsTable)
          .innerJoin(chatsTable, eq(userChatsTable.chatId, chatsTable.chatId))
          .where(eq(userChatsTable.userId, userIdString))
      );
    if (userChatsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user chats.",
        cause: userChatsQueryError,
      });
    }
    return c.json({ chats: userChatsQueryResult });
  });
