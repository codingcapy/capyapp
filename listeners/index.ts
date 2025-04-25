import type { Server } from "socket.io";

export function attachListeners(io: Server) {
  io.on("connection", (socket) => {
    socket.on("message", (body) => {
      socket.broadcast.emit("message", {
        body,
        from: socket.id.slice(6),
      });
    });
    socket.on("friend", (body) => {
      socket.broadcast.emit("friend", {
        body,
        from: socket.id.slice(6),
      });
    });
    socket.on("chat", (body) => {
      socket.broadcast.emit("chat", {
        body,
        from: socket.id.slice(6),
      });
    });
    socket.on("reaction", (body) => {
      socket.broadcast.emit("reaction", {
        body,
        from: socket.id.slice(6),
      });
    });
  });
}
