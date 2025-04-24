import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { reactions as reactionsTable } from "../schemas/reactions";
import { createInsertSchema } from "drizzle-zod";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm";

export const reactionsRouter = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      createInsertSchema(reactionsTable).omit({
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: reactionQueryError, result: reactionQueryResult } =
        await mightFail(
          db
            .select()
            .from(reactionsTable)
            .where(
              and(
                eq(reactionsTable.userId, insertValues.userId),
                eq(reactionsTable.messageId, insertValues.messageId),
                eq(reactionsTable.content, insertValues.content)
              )
            )
        );
      if (reactionQueryError)
        throw new HTTPException(500, {
          message: "Error while querying friend",
          cause: reactionQueryResult,
        });
      if (reactionQueryResult.length > 0)
        return c.json({ message: "Reaction already exists" }, 500);
      const { error: reactionInsertError, result: reactionInsertResult } =
        await mightFail(
          db
            .insert(reactionsTable)
            .values({ ...insertValues })
            .returning()
        );
      if (reactionInsertError) {
        console.log("Error while creating message:", reactionInsertResult);
        throw new HTTPException(500, {
          message: "Error while creating message",
          cause: reactionInsertError,
        });
      }
      return c.json({ reaction: reactionInsertResult[0] }, 200);
    }
  )
  .get(async (c) => {
    const { result: reactionsQueryResult, error: reactionsQueryError } =
      await mightFail(db.select().from(reactionsTable));
    if (reactionsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching reactions.",
        cause: reactionsQueryError,
      });
    }
    return c.json({ reactions: reactionsQueryResult });
  })
  .delete(
    "/",
    zValidator(
      "json",
      createInsertSchema(reactionsTable).omit({
        chatId: true,
        messageId: true,
        content: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const insertValues = c.req.valid("json");
      const { error: reactionDeleteError, result: reactionDeleteResult } =
        await mightFail(
          db
            .delete(reactionsTable)
            .where(
              eq(reactionsTable.reactionId, Number(insertValues.reactionId))
            )
        );

      if (reactionDeleteError) {
        throw new HTTPException(500, {
          message: "Error when deleting blog.",
          cause: reactionDeleteError,
        });
      }
    }
  )
  .get("/:chatId", async (c) => {
    const chatId = c.req.param("chatId");
    if (!chatId) {
      return c.json({ error: "chatId parameter is required." }, 400);
    }
    const { result: reactionsQueryResult, error: reactionsQueryError } =
      await mightFail(
        db
          .select()
          .from(reactionsTable)
          .where(eq(reactionsTable.chatId, Number(chatId)))
      );
    if (reactionsQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching reactions.",
        cause: reactionsQueryResult,
      });
    }
    return c.json({ chats: reactionsQueryResult });
  });
