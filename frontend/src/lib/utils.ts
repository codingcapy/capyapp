import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Friend } from "./api/friend";
import { getAccessToken } from "../services/jwt.service";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function authHeaders() {
  const token = getAccessToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}

// Falls back to other participants' usernames when a chat has no title, and
// to the current user's own username when everyone else has left the chat.
export function getChatDisplayTitle(
  title: string | null | undefined,
  participants: Friend[] | undefined,
  currentUser: { userId: string; username: string } | null | undefined,
): string {
  if (title) return title;
  const others = participants?.filter(
    (participant) => participant.userId !== currentUser?.userId,
  );
  if (others && others.length > 0) {
    return others.map((participant) => participant.username).join(", ");
  }
  return currentUser?.username ?? "";
}
