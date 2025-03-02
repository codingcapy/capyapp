import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userChats as userChatsTable } from "../schemas/userchats";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";

export const userChatsRouter = new Hono().post(
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
);
