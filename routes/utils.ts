import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";

export function requireUser(c: Context) {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  try {
    return jwt.verify(authHeader.split(" ")[1]!, process.env.JWT_SECRET!) as {
      id: string;
    };
  } catch {
    throw new HTTPException(401, { message: "Invalid token" });
  }
}

// Short-lived; kept in memory on the client instead of persisted storage.
export const ACCESS_TOKEN_EXPIRY = "15m";
// Long-lived; only ever handed to the client as an httpOnly cookie.
export const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_COOKIE = "refresh_token";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
