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
