import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { randomUUIDv7 } from "bun";
import { db } from "../db";
import { users as usersTable } from "../schemas/users";
import { refreshTokens as refreshTokensTable } from "../schemas/refreshTokens";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { enforceRateLimit } from "./rateLimit";
import {
  ACCESS_TOKEN_EXPIRY,
  hashToken,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_EXPIRY_MS,
} from "./utils";
import type { Context } from "hono";

const scryptAsync = promisify(scrypt);

const isProduction = process.env.NODE_ENV === "production";
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "Lax" as const,
  path: "/api/v0/user",
};

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

function signAccessToken(userId: string) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

// Issues a new refresh token, persists its hash, and sets it as an httpOnly
// cookie. Callers must revoke any prior token being rotated beforehand.
async function issueRefreshToken(c: Context, userId: string) {
  const rawToken = randomBytes(48).toString("base64url");
  await db.insert(refreshTokensTable).values({
    id: randomUUIDv7(),
    userId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });
  setCookie(c, REFRESH_TOKEN_COOKIE, rawToken, {
    ...refreshCookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRY_MS / 1000,
  });
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
      if (!user) return c.json({ result: { user: null, accessToken: null } });
      if (user.status !== "active")
        return c.json({ result: { user: null, accessToken: null } });
      const isPasswordValid = await verifyPassword(
        user.password,
        loginInfo.password,
      );
      if (!isPasswordValid) {
        return c.json({ result: { user: null, accessToken: null } });
      }
      await issueRefreshToken(c, user.userId);
      const accessToken = signAccessToken(user.userId);
      return c.json({ result: { user: toSafeUser(user), accessToken } });
    } catch (error) {
      console.error(error);
      c.status(500);
      return c.json({ message: "Internal Server Error" });
    }
  })
  .post("/refresh", async (c) => {
    const rawToken = getCookie(c, REFRESH_TOKEN_COOKIE);
    if (!rawToken) {
      c.status(401);
      return c.json({ message: "Unauthorized" });
    }
    const tokenHash = hashToken(rawToken);
    try {
      const [storedToken] = await db
        .select()
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.tokenHash, tokenHash));

      if (!storedToken) {
        deleteCookie(c, REFRESH_TOKEN_COOKIE, refreshCookieOptions);
        c.status(401);
        return c.json({ message: "Unauthorized" });
      }

      // A previously-revoked or expired token being replayed means the
      // cookie may have leaked; treat the user's whole session as
      // compromised and revoke every outstanding refresh token for them.
      if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        await db
          .update(refreshTokensTable)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(refreshTokensTable.userId, storedToken.userId),
              isNull(refreshTokensTable.revokedAt),
            ),
          );
        deleteCookie(c, REFRESH_TOKEN_COOKIE, refreshCookieOptions);
        c.status(401);
        return c.json({ message: "Unauthorized" });
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.userId, storedToken.userId));
      if (!user || user.status !== "active") {
        deleteCookie(c, REFRESH_TOKEN_COOKIE, refreshCookieOptions);
        c.status(401);
        return c.json({ message: "Unauthorized" });
      }

      await db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokensTable.id, storedToken.id));
      await issueRefreshToken(c, user.userId);
      const accessToken = signAccessToken(user.userId);
      return c.json({ result: { user: toSafeUser(user), accessToken } });
    } catch (error) {
      console.error(error);
      c.status(500);
      return c.json({ message: "Internal Server Error" });
    }
  })
  .post("/logout", async (c) => {
    const rawToken = getCookie(c, REFRESH_TOKEN_COOKIE);
    if (rawToken) {
      await db
        .update(refreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokensTable.tokenHash, hashToken(rawToken)));
    }
    deleteCookie(c, REFRESH_TOKEN_COOKIE, refreshCookieOptions);
    return c.json({ result: { success: true } });
  });
