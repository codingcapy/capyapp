import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const userChatReadStatus = pgTable("user_chat_read_status", {
  UserChatReadStatusId: serial("user_chat_read_status_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  chatId: integer("chat_id").notNull(),
  lastReadMessageId: integer("last_read_message_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserChatReadStatus = InferSelectModel<typeof userChatReadStatus>;
