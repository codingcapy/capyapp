import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { usersRouter } from "./routes/users";
import { userRouter } from "./routes/user";
import { userFriendsRouter } from "./routes/friends";
import { Server as SocketServer } from "socket.io";
import { serve } from "@hono/node-server";
import { attachSocketEventListeners } from "./ws";
import { userChatsRouter } from "./routes/chats";
import { messagesRouter } from "./routes/messages";
import { reactionsRouter } from "./routes/reactions";
import { imagesRouter } from "./routes/images";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

const apiRoutes = app
  .basePath("/api/v0")
  .route("/users", usersRouter)
  .route("/user", userRouter)
  .route("/friends", userFriendsRouter)
  .route("/chats", userChatsRouter)
  .route("/messages", messagesRouter)
  .route("/reactions", reactionsRouter)
  .route("/images", imagesRouter);

app.use("/*", serveStatic({ root: "./frontend/dist" }));
app.get("/*", async (c) => {
  try {
    const indexHtml = await Bun.file("./frontend/dist/index.html").text();
    return c.html(indexHtml);
  } catch (error) {
    console.error("Error reading index.html:", error);
    return c.text("Internal Server Error", 500);
  }
});

export type ApiRoutes = typeof apiRoutes;
export default app;

const PORT = parseInt(process.env.PORT!) || 3333;

const server = serve({
  port: PORT,
  fetch: app.fetch,
});

const io = new SocketServer(server, {
  path: "/ws",
  serveClient: false,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

attachSocketEventListeners(io);

console.log("Server running on port", PORT);

// import { db } from "./db";
// import { userChats as userChatsTable } from "./schemas/userchats";
// import { userChatReadStatus as userChatReadStatusTable } from "./schemas/userchatreadstatus";
// import { messages as messagesTable } from "./schemas/messages";
// import { and, desc, eq } from "drizzle-orm";
// async function backfillUserChatReadStatuses() {
//   console.log("Starting backfill for UserChatReadStatus...");
//   // 1. Fetch all user-chat relationships
//   const userChats = await db.select().from(userChatsTable);
//   console.log(`Found ${userChats.length} user-chat relationships.`);
//   for (const userChat of userChats) {
//     const { userId, chatId } = userChat;
//     // 2. Check if UserChatReadStatus already exists
//     const existing = await db
//       .select()
//       .from(userChatReadStatusTable)
//       .where(
//         and(
//           eq(userChatReadStatusTable.userId, userId),
//           eq(userChatReadStatusTable.chatId, chatId)
//         )
//       );
//     if (existing.length === 0) {
//       // 3. Get latest messageId for the chat
//       const lastMessage = await db
//         .select({ messageId: messagesTable.messageId })
//         .from(messagesTable)
//         .where(eq(messagesTable.chatId, chatId))
//         .orderBy(desc(messagesTable.messageId))
//         .limit(1);
//       const lastReadMessageId =
//         lastMessage.length > 0 ? lastMessage[0].messageId : null;
//       // 4. Insert UserChatReadStatus
//       await db.insert(userChatReadStatusTable).values({
//         userId,
//         chatId,
//         lastReadMessageId, // or null if you want all prior messages as unread
//       });
//       console.log(
//         `Inserted UserChatReadStatus for userId=${userId}, chatId=${chatId}, lastReadMessageId=${lastReadMessageId}`
//       );
//     }
//   }
//   console.log("Backfill completed.");
// }

// backfillUserChatReadStatuses()
//   .then(() => process.exit(0))
//   .catch((err) => {
//     console.error("Error during backfill:", err);
//     process.exit(1);
//   });
