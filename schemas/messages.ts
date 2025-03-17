import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const messages = pgTable("messages", {
  messageId: serial("message_id").primaryKey(),
  chatId: integer("chat_id"),
  userId: varchar("user_id"),
  content: varchar("content").notNull(),
  replyUserId: varchar("reply_user_id", { length: 32 }),
  replyContent: varchar("reply_content", { length: 25000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = InferSelectModel<typeof messages>;
