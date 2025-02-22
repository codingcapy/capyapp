import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { users as usersTable } from "../schemas/users";
import { mightFail } from "might-fail";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";

const saltRounds = 6;

export const usersRouter = new Hono()
  .post(
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
      const { error: emailQueryError, result: emailQueryResult } =
        await mightFail(
          db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, insertValues.email))
        );
      if (emailQueryError) {
        throw new HTTPException(500, {
          message: "Error while fetching users",
          cause: emailQueryResult,
        });
      }
      if (emailQueryResult.length > 0) {
        return c.json(
          { message: "An account with this email already exists" },
          409
        );
      }
      const userId = randomUUIDv7();
      const encrypted = await bcrypt.hash(insertValues.password, saltRounds);
      const { error: userInsertError, result: userInsertResult } =
        await mightFail(
          db
            .insert(usersTable)
            .values({
              userId: userId,
              username: insertValues.username,
              email: insertValues.email,
              password: encrypted,
            })
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
  )
  .get(async (c) => {
    const { error: usersQueryError, result: usersQueryResult } =
      await mightFail(db.select().from(usersTable));

    if (usersQueryError) {
      throw new HTTPException(500, {
        message: "Error while fetching users",
        cause: usersQueryError,
      });
    }
    return c.json({ users: usersQueryResult }, 200);
  });
