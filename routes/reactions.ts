import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { reactions as reactionsTable } from "../schemas/reactions";
import { createInsertSchema } from "drizzle-zod";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";

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
  });
