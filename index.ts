import app from "./app";

Bun.serve({
  port: process.env.PORT || 3333,
  fetch: app.fetch,
});

console.log("Server running");
