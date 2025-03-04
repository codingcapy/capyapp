import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const userChats = pgTable("user_chats", {
  userChatId: serial("user_chat_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  chatId: integer("chat_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserChat = InferSelectModel<typeof userChats>;
