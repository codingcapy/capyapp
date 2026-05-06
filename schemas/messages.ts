import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { chats } from "./chats";
import { users } from "./users";

export const messages = pgTable(
  "messages",
  {
    messageId: serial("message_id").primaryKey(),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.chatId),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId),
    content: varchar("content", { length: 25000 }).notNull(),
    replyUserId: varchar("reply_user_id", { length: 100 }),
    replyContent: varchar("reply_content", { length: 25000 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("messages_chat_id_idx").on(table.chatId)],
);

export type Message = InferSelectModel<typeof messages>;
