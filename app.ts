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

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

const apiRoutes = app
  .basePath("/api/v0")
  .route("/users", usersRouter)
  .route("/user", userRouter)
  .route("/friends", userFriendsRouter)
  .route("/chats", userChatsRouter);

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
});

attachSocketEventListeners(io);

console.log("Server running on port", PORT);
