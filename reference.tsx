//userChats.ts

import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "./users";
import { chats } from "./chats";
import { messages } from "./messages";

export const userChats = pgTable(
  "user_chats",
  {
    userChatId: serial("user_chat_id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.chatId),
    // Nullable: a user who has never opened the chat has no read position yet.
    // onDelete: "set null" so deleting the referenced message doesn't take
    // out the whole user_chats row (e.g. if messages can be hard-deleted).
    lastReadMessageId: integer("last_read_message_id").references(
      () => messages.messageId,
      { onDelete: "set null" },
    ),
    lastReadAt: timestamp("last_read_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_chats_user_id_idx").on(table.userId),
    index("user_chats_chat_id_idx").on(table.chatId),
    uniqueIndex("user_chats_user_chat_unique_idx").on(
      table.userId,
      table.chatId,
    ),
  ],
);

export type UserChat = InferSelectModel<typeof userChats>;

//messages.ts
import { zValidator } from "@hono/zod-validator";
import { createInsertSchema } from "drizzle-zod";
import { Hono } from "hono";
import { messages as messagesTable } from "../schemas/messages";
import { userChats as userChatsTable } from "../schemas/userChats";
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
  //
  // TODO: add a membership check here (does requireUser's user belong to
  // this chatId?) — requireUser only confirms authentication, not access
  // to this specific chat.
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
  );

//Messages.tsx

import type { Chat } from "@server/schemas/chats";
import type { Message } from "@server/schemas/messages";
import { FaPlusCircle } from "react-icons/fa";
import { PiSmiley } from "react-icons/pi";
import {
  appendMessageToChatCache,
  mapSerializedMessageToSchema,
  useCreateMessageMutation,
  useMarkMessageReadMutation,
  useMessagesQuery,
  type SerializedMessage,
} from "../lib/api/messages";
import useAuthStore from "../store/AuthStore";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CgProfile } from "react-icons/cg";
import { socket } from "../routes/dashboard";
import { useQueryClient } from "@tanstack/react-query";

function formatMessageTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Messages(props: { chat: Chat | null }) {
  const chatId = props.chat?.chatId ?? null;
  const { mutate: createMessage, isPending: createMessagePending } =
    useCreateMessageMutation();
  const { mutate: markMessageRead } = useMarkMessageReadMutation();
  const { user } = useAuthStore();
  const [messageContent, setMessageContent] = useState("");
  const [unseenCount, setUnseenCount] = useState(0);
  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
    hasPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isPending: messagesPending,
  } = useMessagesQuery(chatId ?? -1, { enabled: chatId != null });
  const queryClient = useQueryClient();

  const messages = useMemo(() => {
    const flat = data?.pages.flatMap((page) => page.messages) ?? [];
    // Defensive dedupe: page windows shouldn't overlap in normal operation,
    // but a stale "initial" refetch or any other cache race could
    // momentarily produce the same messageId in two pages. Keep the first
    // occurrence so ordering stays stable.
    const seen = new Set<number>();
    return flat.filter((message) => {
      if (seen.has(message.messageId)) return false;
      seen.add(message.messageId);
      return true;
    });
  }, [data]);
  // anchorId only comes back on the initial/anchor-centered page, i.e. the
  // first page ever fetched for this chat — later before/after pages don't
  // carry one, so this stays stable once set.
  const anchorId = data?.pages[0]?.anchorId ?? null;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const messageElementRefs = useRef(new Map<number, HTMLDivElement>());
  const hasDoneInitialScrollRef = useRef(false);
  const lastMarkedReadIdRef = useRef<number | null>(null);
  // Whether the user's viewport is currently showing the true newest
  // message (bottom sentinel visible AND no unfetched newer pages behind
  // it). Read from the socket handler, so it's a ref rather than state —
  // we need the current value inside a closure that isn't re-created on
  // every scroll tick.
  const isAtBottomRef = useRef(false);
  // Set to true when we've decided a new message should scroll the view
  // down, but haven't actually scrolled yet. Cache updates (setQueryData)
  // don't commit to the DOM synchronously, so scrolling immediately after
  // appendMessageToChatCache measures the *old* scrollHeight — short by
  // exactly the new message's height. This flag lets a layout effect do
  // the scroll after React has actually painted the new row.
  const pendingScrollToBottomRef = useRef(false);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
    }
  }

  // Runs after every commit that changed the message list. Only acts when
  // something upstream actually asked for a scroll (via the pending flag),
  // so this doesn't interfere with e.g. loading older pages.
  useLayoutEffect(() => {
    if (pendingScrollToBottomRef.current) {
      pendingScrollToBottomRef.current = false;
      scrollToBottom();
    }
  }, [messages]);

  // Reset per-chat state when switching chats, so stale refs/flags from
  // the previous chat don't leak into the new one.
  useEffect(() => {
    hasDoneInitialScrollRef.current = false;
    lastMarkedReadIdRef.current = null;
    isAtBottomRef.current = false;
    pendingScrollToBottomRef.current = false;
    messageElementRefs.current.clear();
    setUnseenCount(0);
  }, [chatId]);

  // Live updates over the socket. The server/other clients should be
  // broadcasting the actual persisted message (see the emit in
  // handleSubmitCreateMessage below) so every recipient — including a
  // sender that gets its own message echoed back — has a real messageId to
  // dedupe against via appendMessageToChatCache.
  useEffect(() => {
    if (chatId == null) return;

    function handleIncomingMessage(raw: SerializedMessage) {
      if (raw.chatId !== chatId) return;
      const message = mapSerializedMessageToSchema(raw);
      appendMessageToChatCache(queryClient, chatId, message);

      const isOwnMessage = user != null && message.userId === user.userId;
      if (isOwnMessage || isAtBottomRef.current) {
        // Either it's something we just sent ourselves, or we're already
        // viewing the newest message — reveal it once the DOM catches up
        // with the cache update above (see pendingScrollToBottomRef).
        pendingScrollToBottomRef.current = true;
        if (!isOwnMessage) {
          lastMarkedReadIdRef.current = message.messageId;
          markMessageRead({ chatId, messageId: message.messageId });
        }
        setUnseenCount(0);
      } else {
        // User is scrolled up reading history — don't yank them down,
        // just let them know something new arrived.
        setUnseenCount((count) => count + 1);
      }
    }

    socket.on("message", handleIncomingMessage);
    return () => {
      socket.off("message", handleIncomingMessage);
    };
  }, [chatId, queryClient, user, markMessageRead]);

  // Initial positioning: jump to the anchor message (the user's last read
  // position) if one came back, otherwise land at the bottom (newest
  // messages, or a brand-new chat with nothing read yet).
  useLayoutEffect(() => {
    if (hasDoneInitialScrollRef.current) return;
    if (messagesPending || messages.length === 0) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    if (anchorId != null) {
      const anchorEl = messageElementRefs.current.get(anchorId);
      anchorEl?.scrollIntoView({ block: "center" });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    hasDoneInitialScrollRef.current = true;
  }, [messagesPending, messages.length, anchorId]);

  // Preserve scroll position when older messages are prepended above the
  // current view — without this, prepending content shoves the viewport
  // down and the user loses their place.
  const prependAdjustmentRef = useRef<{ scrollHeight: number } | null>(null);
  useLayoutEffect(() => {
    if (isFetchingPreviousPage) {
      prependAdjustmentRef.current = {
        scrollHeight: scrollContainerRef.current?.scrollHeight ?? 0,
      };
    } else if (prependAdjustmentRef.current) {
      const container = scrollContainerRef.current;
      const prevHeight = prependAdjustmentRef.current.scrollHeight;
      prependAdjustmentRef.current = null;
      if (container) {
        container.scrollTop += container.scrollHeight - prevHeight;
      }
    }
  }, [isFetchingPreviousPage]);

  // Scroll-triggered pagination: watch top/bottom sentinels rather than
  // computing scroll math by hand on every scroll event. Also tracks
  // isAtBottomRef and clears the unseen-messages toast once the user
  // scrolls back down to the true newest message themselves.
  useEffect(() => {
    const container = scrollContainerRef.current;
    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;
    if (!container || !topSentinel || !bottomSentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === topSentinel) {
            if (
              entry.isIntersecting &&
              hasPreviousPage &&
              !isFetchingPreviousPage
            ) {
              fetchPreviousPage();
            }
          } else if (entry.target === bottomSentinel) {
            const atBottom = entry.isIntersecting && !hasNextPage;
            isAtBottomRef.current = atBottom;

            if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            } else if (atBottom && chatId != null) {
              // Genuinely caught up to the newest message — record it as read.
              const latest = messages[messages.length - 1];
              if (latest && latest.messageId !== lastMarkedReadIdRef.current) {
                lastMarkedReadIdRef.current = latest.messageId;
                markMessageRead({ chatId, messageId: latest.messageId });
              }
              setUnseenCount(0);
            }
          }
        }
      },
      { root: container, threshold: 0 },
    );
    observer.observe(topSentinel);
    observer.observe(bottomSentinel);
    return () => observer.disconnect();
  }, [
    chatId,
    hasPreviousPage,
    hasNextPage,
    isFetchingPreviousPage,
    isFetchingNextPage,
    fetchPreviousPage,
    fetchNextPage,
    messages,
    markMessageRead,
  ]);

  function setMessageElementRef(messageId: number) {
    return (el: HTMLDivElement | null) => {
      if (el) {
        messageElementRefs.current.set(messageId, el);
      } else {
        messageElementRefs.current.delete(messageId);
      }
    };
  }

  function displayNameFor(message: Message): string {
    // TODO: replace with a real username lookup once one's available —
    // this just distinguishes "you" from everyone else for now.
    if (user && message.userId === user.userId) return "You";
    return message.userId;
  }

  function handleJumpToLatest() {
    setUnseenCount(0);
    scrollToBottom();
    // If there's a gap of unfetched newer messages, kick off catching up —
    // the bottom sentinel's IntersectionObserver will keep the chain going
    // as it comes back into view.
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }

  function handleSubmitCreateMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (createMessagePending || !user || !props.chat || !messageContent.trim())
      return;
    createMessage(
      {
        userId: user.userId,
        chatId: props.chat.chatId,
        content: messageContent,
      },
      {
        onSuccess: (result) => {
          setMessageContent("");
          setUnseenCount(0);
          pendingScrollToBottomRef.current = true;
          // Broadcast the real persisted row (with its messageId) so every
          // recipient — including this client, if the server echoes back
          // to the sender — can dedupe and append it reliably.
          socket.emit("message", result.message);
        },
      },
    );
  }

  return (
    <div className="h-screen w-full">
      <div className="h-[40px] bg-sky-400 flex items-center">
        <div className="pl-2 font-bold">
          {props.chat ? props.chat.title : "Loading..."}
        </div>
      </div>
      <div className="relative flex-1 h-[75%] lg:h-[80%]">
        <div ref={scrollContainerRef} className="h-full overflow-auto px-5">
          <div ref={topSentinelRef} />
          {chatId == null ? (
            <div className="text-center text-sky-100 mt-10">
              Select a chat to get started.
            </div>
          ) : messagesPending ? (
            <div className="text-center text-sky-100 mt-10">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sky-100 mt-10">
              No messages yet — say hello!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.messageId}
                ref={setMessageElementRef(message.messageId)}
                className="flex my-5"
              >
                {/* Placeholder profile pic */}
                <CgProfile size={50} />
                <div className="pl-2">
                  <div className="flex items-center">
                    <div className="font-bold cursor-pointer hover:underline">
                      {displayNameFor(message)}
                    </div>
                    <div className="pl-2 text-sky-100 text-xs">
                      {formatMessageTimestamp(message.createdAt)}
                    </div>
                  </div>
                  {message.replyContent && (
                    <div className="text-xs text-sky-100 border-l-2 border-sky-300 pl-2 mb-1">
                      {message.replyContent}
                    </div>
                  )}
                  <div>{message.content}</div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomSentinelRef} />
        </div>
        {unseenCount > 0 && (
          <button
            type="button"
            onClick={handleJumpToLatest}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-colors"
          >
            {unseenCount} new message{unseenCount > 1 ? "s" : ""} ↓
          </button>
        )}
      </div>
      <form onSubmit={handleSubmitCreateMessage}>
        <div className="shrink-0 bg-sky-400 h-[70px] flex items-center justify-center">
          <div className="border border-[#777777] rounded bg-sky-800 px-3 py-3 w-[90%] flex items-center justify-center">
            <FaPlusCircle
              size={27}
              className="cursor-pointer hover:text-sky-300 transition-all ease-in-out duration-300"
            />
            <input
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              type="text"
              disabled={!props.chat}
              className="w-[100%] outline-none pl-2"
            />
            <PiSmiley
              size={27}
              className="cursor-pointer hover:text-sky-300 transition-all ease-in-out duration-300"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
