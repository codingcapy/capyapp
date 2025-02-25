import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { zValidator } from "@hono/zod-validator";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";

export const userFriendsRouter = new Hono()
  .post(
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
      const { error: emailQueryError, result: emailQueryResult } =
        await mightFail(
          db
            .select()
            .from(userFriendsTable)
            .where(eq(userFriendsTable.friendEmail, insertValues.friendEmail))
        );
      if (emailQueryError) {
        throw new HTTPException(500, {
          message: "Error while fetching user_friend",
          cause: emailQueryResult,
        });
      }
      if (emailQueryResult.length > 0) {
        return c.json({ message: "This person is already your friend" }, 409);
      }
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
  )
  .get(async (c) => {
    const { error: userFriendsQueryError, result: userFriendsQueryResult } =
      await mightFail(db.select().from(userFriendsTable));

    if (userFriendsQueryError) {
      throw new HTTPException(500, {
        message: "Error while fetching user_friends",
        cause: userFriendsQueryError,
      });
    }
    return c.json({ users: userFriendsQueryResult }, 200);
  });
