import { Hono } from "hono";
import { notifications as notificationsTable } from "../schemas/notifications";
import { mightFail } from "might-fail";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

export const notificationsRouter = new Hono().get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  if (!userId) {
    return c.json({ error: "userId parameter is required." }, 400);
  }
  const { result: notificationsQueryResult, error: notificationsQueryError } =
    await mightFail(
      db
        .select()
        .from(notificationsTable)
        .where(eq(notificationsTable.userId, userId))
    );
  if (notificationsQueryError) {
    throw new HTTPException(500, {
      message: "Error occurred when fetching user friends.",
      cause: notificationsQueryError,
    });
  }
  return c.json({ friends: notificationsQueryResult });
});
