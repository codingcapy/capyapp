import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { users as usersTable } from "../schemas/users";
import { mightFail } from "might-fail";
import { HTTPException } from "hono/http-exception";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { randomUUIDv7 } from "bun";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(hash: string, password: string) {
  const [salt, key] = hash.split(":");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return derivedKey.toString("hex") === key;
}

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
          message: "Error while fetching user",
          cause: emailQueryResult,
        });
      }
      if (emailQueryResult.length > 0) {
        return c.json(
          { message: "An account with this email already exists" },
          409
        );
      }
      const encrypted = await hashPassword(insertValues.password);
      const userId = randomUUIDv7();
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
