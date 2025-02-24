import type { Server } from "socket.io";
import { attachListeners } from "../listeners";

export function attachSocketEventListeners(io: Server) {
  attachListeners(io);
}
