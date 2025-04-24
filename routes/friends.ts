import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { userFriends as userFriendsTable } from "../schemas/userfriends";
import { users as usersTable } from "../schemas/users";
import { zValidator } from "@hono/zod-validator";
import { mightFail } from "might-fail";
import { db } from "../db";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm";

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
      const { error: userQueryError, result: userQueryResult } =
        await mightFail(
          db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, insertValues.friendEmail))
        );
      if (userQueryError)
        throw new HTTPException(500, {
          message: "Error while querying friend",
          cause: userQueryResult,
        });
      if (userQueryResult.length < 1)
        return c.json({ message: "User does not exist" }, 500);
      const { error: userFriendInsertError, result: userFriendInsertResult } =
        await mightFail(
          db
            .insert(userFriendsTable)
            .values({ ...insertValues })
            .returning()
        );
      if (userFriendInsertError) {
        console.log("Error while creating friend");
        throw new HTTPException(500, {
          message: "Error while creating friend",
          cause: userFriendInsertResult,
        });
      }
      const { error: userFriendInsertError2, result: userFriendInsertResult2 } =
        await mightFail(
          db
            .insert(userFriendsTable)
            .values({
              userEmail: insertValues.friendEmail,
              friendEmail: insertValues.userEmail,
            })
            .returning()
        );
      if (userFriendInsertError2) {
        console.log("Error while creating friend");
        throw new HTTPException(500, {
          message: "Error while creating friend",
          cause: userFriendInsertResult,
        });
      }
      return c.json({ user: userFriendInsertResult[0] }, 200);
    }
  )
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
            profilePic: usersTable.profilePic,
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
  })
  .post(
    "/block",
    zValidator(
      "json",
      createInsertSchema(userFriendsTable).omit({
        userFriendId: true,
        muted: true,
        blocked: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(userFriendsTable)
          .set({ blocked: true })
          .where(
            and(
              eq(userFriendsTable.userEmail, updateValues.userEmail),
              eq(userFriendsTable.friendEmail, updateValues.friendEmail)
            )
          )
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error blocking user",
          cause: queryError,
        });
      }
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  )
  .post(
    "/unblock",
    zValidator(
      "json",
      createInsertSchema(userFriendsTable).omit({
        userFriendId: true,
        muted: true,
        blocked: true,
        createdAt: true,
      })
    ),
    async (c) => {
      const updateValues = c.req.valid("json");
      const { error: queryError, result: newUserResult } = await mightFail(
        db
          .update(userFriendsTable)
          .set({ blocked: false })
          .where(
            and(
              eq(userFriendsTable.userEmail, updateValues.userEmail),
              eq(userFriendsTable.friendEmail, updateValues.friendEmail)
            )
          )
          .returning()
      );
      if (queryError) {
        throw new HTTPException(500, {
          message: "Error blocking user",
          cause: queryError,
        });
      }
      return c.json({ newUser: newUserResult[0] }, 200);
    }
  )
  .get("/userfriends/:userEmail", async (c) => {
    const userEmailString = c.req.param("userEmail");
    if (!userEmailString) {
      return c.json({ error: "userEmail parameter is required." }, 400);
    }
    const { result: userFriendQueryResult, error: userFriendQueryError } =
      await mightFail(
        db
          .select()
          .from(userFriendsTable)
          .where(eq(userFriendsTable.userEmail, userEmailString))
      );
    if (userFriendQueryError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching user friends.",
        cause: userFriendQueryError,
      });
    }
    return c.json({ userFriends: userFriendQueryResult });
  });
