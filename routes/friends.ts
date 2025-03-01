import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { users, users as usersTable } from "../schemas/users";
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
  })
  .get("/:userEmail", async (c) => {
    const userEmailString = c.req.param("userEmail");
    if (!userEmailString) {
      return c.json({ error: "userEmail parameter is required." }, 400);
    }
    const { result: userFriendQueryResult, error: userFriendQueryError } =
      await mightFail(
        db
          .select({
            userId: usersTable.userId,
            username: usersTable.username,
            email: usersTable.email,
            createdAt: usersTable.createdAt,
          })
          .from(userFriendsTable)
          .innerJoin(
            usersTable,
            eq(userFriendsTable.friendEmail, usersTable.email)
          )
          .where(eq(userFriendsTable.userEmail, userEmailString))
      );
    if (userFriendQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user friends.",
        cause: userFriendQueryError,
      });
    }
    return c.json({ friends: userFriendQueryResult });
  });
