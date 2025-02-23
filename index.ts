import app from "./app";

const server = Bun.serve({
  port: process.env.PORT || 3333,
  fetch: app.fetch,
  websocket: {
    open(ws) {
      console.log("New WebSocket connection");
    },
    message(ws, msg) {
      console.log("Received message:", msg);
      server.publish("chat", msg);
    },
  },
});

console.log("Server running on port", server.port);
