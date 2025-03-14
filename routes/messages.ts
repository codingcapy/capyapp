import { Hono } from "hono";
import { messages as messagesTable } from "../schemas/messages";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { mightFail, mightFailSync } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
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
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: messageInsertResult,
        });
      }
      return c.json({ message: messageInsertResult[0] }, 200);
    }
  )
  .get("/:chatId", async (c) => {
    const { chatId: chatIdString } = c.req.param();
    const chatId = assertIsParsableInt(chatIdString);
    if (!chatId) {
      return c.json({ error: "chatId parameter is required." }, 400);
    }
    const { result: messagesQueryResult, error: messagesQueryError } =
      await mightFail(
        db.select().from(messagesTable).where(eq(messagesTable.chatId, chatId))
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
  });
