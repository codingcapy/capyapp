import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { users as usersTable } from "../schema/users";
import { mightFail } from "might-fail";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";

export const usersRouter = new Hono().post(
  "/",
  zValidator(
    "json",
    createInsertSchema(usersTable).omit({
      userId: true,
      createdAt: true,
    })
  ),
  async (c) => {
    const insertValues = c.req.valid("json");
    const { error: userInsertError, result: userInsertResult } =
      await mightFail(
        db
          .insert(usersTable)
          .values({ ...insertValues })
          .returning()
      );

    if (userInsertError) {
      console.log("Error while creating user");
      throw new HTTPException(500, {
        message: "Error while creating user",
        cause: userInsertResult,
      });
    }
    return c.json({ user: userInsertResult[0] }, 200);
  }
);
