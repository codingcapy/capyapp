import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { messages as messagesTable } from "../schemas/messages";
import { userChats as userChatsTable } from "../schemas/userchats";
import { requireUser } from "./utils";
import { HTTPException } from "hono/http-exception";
import { mightFail, mightFailSync } from "might-fail";
import { db } from "../db";
import z from "zod";
import { and, desc, asc, eq, lt, gt, or } from "drizzle-orm";

export function assertIsParsableInt(id: string): number {
  const { result: parsedId, error: parseIdError } = mightFailSync(() =>
    z.coerce.number().int().parse(id),
  );

  if (parseIdError) {
    throw new HTTPException(400, {
      message: `Id ${id} cannot be parsed into a number.`,
      cause: parseIdError,
    });
  }

  return parsedId;
}

// Query schema for GET /:chatId. All fields are strings at the HTTP layer
// (query params are always strings) — coercion/validation into numbers,
// dates, etc. happens after c.req.valid("query"). Declaring this via
// zValidator is what makes the Hono RPC client generate a typed `query`
// option on the client — without it, the client only knows about `param`.
const getMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  anchor: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

// Hard ceiling so a client can't request an absurdly large window.
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 30;

function clampLimit(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.trunc(n), MAX_LIMIT);
}

// Compound keyset cursor: createdAt alone isn't unique enough, so we
// tie-break on messageId to guarantee stable, gap-free pagination.
const cursorSchema = z.object({
  createdAt: z.coerce.date(),
  messageId: z.coerce.number().int(),
});
type Cursor = z.infer<typeof cursorSchema>;

function parseCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  const { result, error } = mightFailSync(() => {
    const [createdAt, messageId] = raw.split("_");
    return cursorSchema.parse({ createdAt, messageId });
  });
  if (error) {
    throw new HTTPException(400, { message: "Invalid cursor." });
  }
  return result;
}

function encodeCursor(row: { createdAt: Date; messageId: number }): string {
  return `${row.createdAt.toISOString()}_${row.messageId}`;
}

// Accepts a possibly-undefined row (e.g. arr[arr.length - 1] under
// noUncheckedIndexedAccess) and returns null instead of throwing.
function cursorOf(
  row: { createdAt: Date; messageId: number } | undefined,
): string | null {
  return row ? encodeCursor(row) : null;
}

// Strictly-older-than cursor (row.createdAt, row.messageId) < (cursor.createdAt, cursor.messageId)
function beforeCursor(chatId: number, cursor: Cursor) {
  return and(
    eq(messagesTable.chatId, chatId),
    or(
      lt(messagesTable.createdAt, cursor.createdAt),
      and(
        eq(messagesTable.createdAt, cursor.createdAt),
        lt(messagesTable.messageId, cursor.messageId),
      ),
    ),
  );
}

// Strictly-newer-than cursor
function afterCursor(chatId: number, cursor: Cursor) {
  return and(
    eq(messagesTable.chatId, chatId),
    or(
      gt(messagesTable.createdAt, cursor.createdAt),
      and(
        eq(messagesTable.createdAt, cursor.createdAt),
        gt(messagesTable.messageId, cursor.messageId),
      ),
    ),
  );
}

type MessageRow = typeof messagesTable.$inferSelect;

// Every branch of GET /:chatId returns exactly this shape. Fields that
// don't apply to a given mode (e.g. hasMoreBefore when scrolling down)
// default to null/false rather than being omitted — omitting them is what
// produced the split union type the RPC client couldn't narrow. The
// client only ever reads the fields relevant to the request it made.
type MessagesPageResponse = {
  messages: MessageRow[];
  prevCursor: string | null;
  nextCursor: string | null;
  hasMoreBefore: boolean;
  hasMoreAfter: boolean;
  anchorId: number | null;
};

function buildPageResponse(
  partial: Partial<MessagesPageResponse> & { messages: MessageRow[] },
): MessagesPageResponse {
  return {
    prevCursor: null,
    nextCursor: null,
    hasMoreBefore: false,
    hasMoreAfter: false,
    anchorId: null,
    ...partial,
  };
}

// Fetches `limit` older + `limit` newer messages around `anchor` and
// shapes the response consistently for both the explicit ?anchor= param
// and the lastReadMessageId-driven default.
async function fetchWindowAroundAnchor(
  chatId: number,
  anchor: MessageRow,
  limit: number,
): Promise<MessagesPageResponse> {
  const anchorCursor: Cursor = {
    createdAt: anchor.createdAt,
    messageId: anchor.messageId,
  };

  const { result: olderResult, error: olderError } = await mightFail(
    db
      .select()
      .from(messagesTable)
      .where(beforeCursor(chatId, anchorCursor))
      .orderBy(desc(messagesTable.createdAt), desc(messagesTable.messageId))
      .limit(limit),
  );
  const { result: newerResult, error: newerError } = await mightFail(
    db
      .select()
      .from(messagesTable)
      .where(afterCursor(chatId, anchorCursor))
      .orderBy(asc(messagesTable.createdAt), asc(messagesTable.messageId))
      .limit(limit),
  );
  if (olderError || newerError) {
    throw new HTTPException(500, {
      message: "Error occurred when fetching messages.",
      cause: olderError ?? newerError,
    });
  }

  const older = olderResult.slice().reverse();
  const newer = newerResult;

  return buildPageResponse({
    messages: [...older, anchor, ...newer],
    prevCursor: cursorOf(older[0]),
    nextCursor: cursorOf(newer[newer.length - 1]),
    hasMoreBefore: olderResult.length === limit,
    hasMoreAfter: newerResult.length === limit,
    anchorId: anchor.messageId,
  });
}

export const messagesRouter = new Hono()
  .post(
    "/",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        messageId: true,
        createdAt: true,
      }),
    ),
    async (c) => {
      const decodedUser = requireUser(c);
      const insertValues = c.req.valid("json");
      // Allow "notification" as a special system userId for chat event messages
      if (
        insertValues.userId !== "notification" &&
        decodedUser.id !== insertValues.userId
      ) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      const { error: messageInsertError, result: messageInsertResult } =
        await mightFail(
          db
            .insert(messagesTable)
            .values({ ...insertValues })
            .returning(),
        );
      if (messageInsertError) {
        console.log("Error while creating message:", messageInsertResult);
        throw new HTTPException(500, {
          message: "Error while creating message",
          cause: messageInsertResult,
        });
      }
      return c.json({ message: messageInsertResult[0] }, 200);
    },
  )
  // GET /:chatId
  //
  // Modes (mutually exclusive):
  //   1. Initial load, no anchor:      returns the newest `limit` messages.
  //   2. Initial load, anchor=<msgId>: returns up to `limit` messages
  //      before AND `limit` messages after the anchor (the "last seen"
  //      message), so the client can render a window centered on it.
  //   3. Scroll up:   before=<cursor>  -> older messages, keyset paginated.
  //   4. Scroll down: after=<cursor>   -> newer messages, keyset paginated.
  .get("/:chatId", zValidator("query", getMessagesQuerySchema), async (c) => {
    const decodedUser = requireUser(c);
    const { chatId: chatIdString } = c.req.param();
    const chatId = assertIsParsableInt(chatIdString);
    const query = c.req.valid("query");
    const limit = clampLimit(query.limit);

    const anchorParam = query.anchor;
    const beforeParam = parseCursor(query.before);
    const afterParam = parseCursor(query.after);

    if ([anchorParam, beforeParam, afterParam].filter(Boolean).length > 1) {
      throw new HTTPException(400, {
        message: "Pass only one of anchor, before, after.",
      });
    }

    // --- Mode 4: scroll down (fetch newer messages) ---
    if (afterParam) {
      const { result, error } = await mightFail(
        db
          .select()
          .from(messagesTable)
          .where(afterCursor(chatId, afterParam))
          .orderBy(asc(messagesTable.createdAt), asc(messagesTable.messageId))
          .limit(limit),
      );
      if (error) {
        throw new HTTPException(500, {
          message: "Error occurred when fetching messages.",
          cause: error,
        });
      }
      return c.json(
        buildPageResponse({
          messages: result,
          nextCursor: cursorOf(result[result.length - 1]),
          hasMoreAfter: result.length === limit,
        }),
      );
    }

    // --- Mode 3: scroll up (fetch older messages) ---
    if (beforeParam) {
      const { result, error } = await mightFail(
        db
          .select()
          .from(messagesTable)
          .where(beforeCursor(chatId, beforeParam))
          .orderBy(desc(messagesTable.createdAt), desc(messagesTable.messageId))
          .limit(limit),
      );
      if (error) {
        throw new HTTPException(500, {
          message: "Error occurred when fetching messages.",
          cause: error,
        });
      }
      const ordered = result.slice().reverse(); // chronological order for the client
      return c.json(
        buildPageResponse({
          messages: ordered,
          prevCursor: cursorOf(result[result.length - 1]),
          hasMoreBefore: result.length === limit,
        }),
      );
    }

    // --- Mode 2: initial load centered on an explicit anchor ---
    if (anchorParam) {
      const anchorId = assertIsParsableInt(anchorParam);
      const { result: anchorRow, error: anchorError } = await mightFail(
        db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.messageId, anchorId))
          .limit(1),
      );
      if (anchorError || !anchorRow[0]) {
        throw new HTTPException(404, { message: "Anchor message not found." });
      }
      return c.json(await fetchWindowAroundAnchor(chatId, anchorRow[0], limit));
    }

    // --- Mode 1: no explicit anchor ---
    // Fall back to the user's persisted read position (user_chats.lastReadMessageId)
    // so re-opening a chat resumes where they left off, even from a new device.
    const { result: userChatRow, error: userChatError } = await mightFail(
      db
        .select({ lastReadMessageId: userChatsTable.lastReadMessageId })
        .from(userChatsTable)
        .where(
          and(
            eq(userChatsTable.userId, decodedUser.id),
            eq(userChatsTable.chatId, chatId),
          ),
        )
        .limit(1),
    );
    if (userChatError) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching read position.",
        cause: userChatError,
      });
    }
    const lastReadMessageId = userChatRow[0]?.lastReadMessageId;

    if (lastReadMessageId != null) {
      const { result: anchorRow, error: anchorError } = await mightFail(
        db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.messageId, lastReadMessageId))
          .limit(1),
      );
      // The stored read position can point at a message that was since
      // deleted (hence "set null" on the FK not always having fired yet,
      // or a race) — fall through to newest-window instead of erroring.
      if (!anchorError && anchorRow[0]) {
        return c.json(
          await fetchWindowAroundAnchor(chatId, anchorRow[0], limit),
        );
      }
    }

    // No anchor, no stored read position: just the newest window.
    const { result, error } = await mightFail(
      db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.chatId, chatId))
        .orderBy(desc(messagesTable.createdAt), desc(messagesTable.messageId))
        .limit(limit),
    );
    if (error) {
      throw new HTTPException(500, {
        message: "Error occurred when fetching messages.",
        cause: error,
      });
    }
    const ordered = result.slice().reverse();
    return c.json(
      buildPageResponse({
        messages: ordered,
        prevCursor: cursorOf(result[result.length - 1]),
        hasMoreBefore: result.length === limit,
      }),
    );
  })
  // PATCH /:chatId/read
  //
  // Updates (or creates) the caller's read position for this chat. Call
  // this when the user has actually seen a message — e.g. once they've
  // scrolled to it and it's stayed in view — not on every prefetch.
  .patch(
    "/:chatId/read",
    zValidator("json", z.object({ messageId: z.number().int() })),
    async (c) => {
      const decodedUser = requireUser(c);
      const { chatId: chatIdString } = c.req.param();
      const chatId = assertIsParsableInt(chatIdString);
      const { messageId } = c.req.valid("json");

      // Confirm the message actually belongs to this chat before recording
      // it as the read position, so a caller can't point it at another chat.
      const { result: messageRow, error: messageError } = await mightFail(
        db
          .select({ chatId: messagesTable.chatId })
          .from(messagesTable)
          .where(eq(messagesTable.messageId, messageId))
          .limit(1),
      );
      if (messageError || !messageRow[0] || messageRow[0].chatId !== chatId) {
        throw new HTTPException(404, {
          message: "Message not found in this chat.",
        });
      }

      const { error: upsertError } = await mightFail(
        db
          .insert(userChatsTable)
          .values({
            userId: decodedUser.id,
            chatId,
            lastReadMessageId: messageId,
            lastReadAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [userChatsTable.userId, userChatsTable.chatId],
            set: { lastReadMessageId: messageId, lastReadAt: new Date() },
          }),
      );
      if (upsertError) {
        throw new HTTPException(500, {
          message: "Error occurred when updating read position.",
          cause: upsertError,
        });
      }
      return c.json({ ok: true });
    },
  )
  .post(
    "/delete",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        chatId: true,
        userId: true,
        content: true,
        createdAt: true,
      }),
    ),
    async (c) => {
      const decodedUser = requireUser(c);
      const deleteValues = c.req.valid("json");
      const { result: msgOwner, error: msgOwnerError } = await mightFail(
        db
          .select({ userId: messagesTable.userId })
          .from(messagesTable)
          .where(eq(messagesTable.messageId, Number(deleteValues.messageId))),
      );
      if (msgOwnerError || !msgOwner.length) {
        throw new HTTPException(404, { message: "Message not found" });
      }
      if (msgOwner[0].userId !== decodedUser.id) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      const { error: messageDeleteError, result: messageDeleteResult } =
        await mightFail(
          db
            .update(messagesTable)
            .set({ content: "[this message has been deleted]" })
            .where(eq(messagesTable.messageId, Number(deleteValues.messageId)))
            .returning(),
        );
      if (messageDeleteError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: messageDeleteResult,
        });
      }
      return c.json({ newMessage: messageDeleteResult[0] }, 200);
    },
  )
  .post(
    "/update",
    zValidator(
      "json",
      createInsertSchema(messagesTable).omit({
        chatId: true,
        userId: true,
        createdAt: true,
      }),
    ),
    async (c) => {
      const decodedUser = requireUser(c);
      const updateValues = c.req.valid("json");
      const { result: msgOwner, error: msgOwnerError } = await mightFail(
        db
          .select({ userId: messagesTable.userId })
          .from(messagesTable)
          .where(eq(messagesTable.messageId, Number(updateValues.messageId))),
      );
      if (msgOwnerError || !msgOwner.length) {
        throw new HTTPException(404, { message: "Message not found" });
      }
      if (msgOwner[0].userId !== decodedUser.id) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      const { error: messageUpdateError, result: messageUpdateResult } =
        await mightFail(
          db
            .update(messagesTable)
            .set({ content: updateValues.content })
            .where(eq(messagesTable.messageId, Number(updateValues.messageId)))
            .returning(),
        );
      if (messageUpdateError) {
        console.log("Error while creating chat");
        throw new HTTPException(500, {
          message: "Error while creating chat",
          cause: messageUpdateResult,
        });
      }
      return c.json({ newMessage: messageUpdateResult[0] }, 200);
    },
  );
