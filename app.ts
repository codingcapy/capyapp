import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { usersRouter } from "./routes/users";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

const apiRoutes = app.basePath("/api/v0").route("/users", usersRouter);

app.use("/*", serveStatic({ root: "./frontend/dist" }));

export type ApiRoutes = typeof apiRoutes;
export default app;
