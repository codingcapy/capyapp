import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const messages = pgTable("messages", {
  messageId: serial("message_id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: varchar("content", { length: 25000 }).notNull(),
  replyUserId: varchar("reply_user_id", { length: 100 }),
  replyContent: varchar("reply_content", { length: 25000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = InferSelectModel<typeof messages>;
