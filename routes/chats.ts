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
      createInsertSchema(chatsTable).omit({
        chatId: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: chatInsertError, result: chatInsertResult } =
        await mightFail(
          db
            .insert(chatsTable)
            .values({ ...insertValues })
            .returning()
        );
      if (chatInsertError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: chatInsertResult,
        });
      }
      return c.json({ user: chatInsertResult[0] }, 200);
    }
  )
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
