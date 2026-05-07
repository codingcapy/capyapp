import type { Server } from "socket.io";

export function attachListeners(io: Server) {
  io.on("connection", (socket) => {
    socket.on("joinRoom", (room: string) => {
      socket.join(room);
    });

    socket.on("leaveRoom", (room: string) => {
      socket.leave(room);
    });

    socket.on("message", (body) => {
      // body = { content, chatId, userId, createdAt }
      // socket.to excludes the sender (same behaviour as the old broadcast)
      socket.to(`chat:${body.chatId}`).emit("message", body);
    });

    socket.on("friend", (body) => {
      // body = { targetUserId }
      socket.to(`user:${body.targetUserId}`).emit("friend", body);
    });

    socket.on("chat", (body) => {
      // body = { title, userId, friendId }
      // Notify both the friend AND the creator so their sidebars update immediately
      io.to(`user:${body.friendId}`).to(`user:${body.userId}`).emit("chat", body);
    });

    socket.on("chatUpdate", (body) => {
      // body = { chatId }
      // Notify all other participants in the chat room about a title change
      socket.to(`chat:${body.chatId}`).emit("chatUpdate", body);
    });

    socket.on("reaction", (body) => {
      // body = Reaction object with chatId
      socket.to(`chat:${body.chatId}`).emit("reaction", body);
    });
  });
}
