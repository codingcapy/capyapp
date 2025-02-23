import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { zValidator } from "@hono/zod-validator";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";

export const userFriendsRouter = new Hono().post(
  "/",
  zValidator(
    "json",
    createInsertSchema(userFriendsTable).omit({
      userFriendId: true,
      createdAt: true,
      blocked: true,
      muted: true,
    })
  ),
  async (c) => {
    const insertValues = c.req.valid("json");
    const { error: userFriendInsertError, result: userFriendInsertResult } =
      await mightFail(
        db
          .insert(userFriendsTable)
          .values({ ...insertValues })
          .returning()
      );
    if (userFriendInsertError) {
      console.log("Error while creating user");
      throw new HTTPException(500, {
        message: "Error while creating user",
        cause: userFriendInsertResult,
      });
    }
    return c.json({ user: userFriendInsertResult[0] }, 200);
  }
);
