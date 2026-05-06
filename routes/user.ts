import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { createInsertSchema } from "drizzle-zod";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { enforceRateLimit } from "./rateLimit";

const scryptAsync = promisify(scrypt);

function toSafeUser(user: typeof usersTable.$inferSelect) {
  const { password, ...safeUser } = user;
  return safeUser;
}

export async function verifyPassword(hash: string, password: string) {
  const parts = hash.split(":");
  if (parts.length !== 2) throw new Error("Invalid hash format");
  const [salt, keyHex] = parts as [string, string];
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(keyHex, "hex");
  if (derivedKey.length !== storedKey.length) return false;
  return timingSafeEqual(derivedKey, storedKey);
}

const loginSchema = z.object({
  email: z.string(),
  password: z.string().max(128),
});

export const userRouter = new Hono()
  .post("/login", zValidator("json", loginSchema), async (c) => {
    try {
      enforceRateLimit(c, "login", 10, 60_000);
      const loginInfo = c.req.valid("json");
      const queryResult = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, loginInfo.email));
      const user = queryResult[0];
      if (!user) return c.json({ result: { user: null, token: null } });
      if (user.status !== "active")
        return c.json({ result: { user: null, token: null } });
      const isPasswordValid = await verifyPassword(
        user.password,
        loginInfo.password,
      );
      if (!isPasswordValid) {
        return c.json({ result: { user: null, token: null } });
      }
      const token = jwt.sign({ id: user.userId }, process.env.JWT_SECRET!, {
        expiresIn: "14 days",
      });
      return c.json({ result: { user: toSafeUser(user), token } });
    } catch (error) {
      console.error(error);
      c.status(500);
      return c.json({ message: "Internal Server Error" });
    }
  })
  .post("/validation", async (c) => {
    try {
      const authHeader = c.req.header("authorization");
      if (!authHeader) {
        c.status(403);
        return c.json({ message: "Header does not exist" });
      }
      const token = authHeader.split(" ")[1];
      const decodedUser = jwt.verify(token!, process.env.JWT_SECRET!);
      const response = await db
        .select()
        .from(usersTable)
        //@ts-ignore
        .where(eq(usersTable.userId, decodedUser.id));
      const user = response[0];
      return c.json({
        result: {
          user: user && user.status === "active" ? toSafeUser(user) : null,
          token,
        },
      });
    } catch (err) {
      c.status(401);
      return c.json({ message: "Unauthorized" });
    }
  });
