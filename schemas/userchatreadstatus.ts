import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "./users";
import { chats } from "./chats";

export const userChatReadStatus = pgTable(
  "user_chat_read_status",
  {
    UserChatReadStatusId: serial("user_chat_read_status_id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.chatId),
    lastReadMessageId: integer("last_read_message_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_chat_read_status_user_id_idx").on(table.userId),
    uniqueIndex("user_chat_read_status_user_chat_unique_idx").on(
      table.userId,
      table.chatId,
    ),
  ],
);

export type UserChatReadStatus = InferSelectModel<typeof userChatReadStatus>;
