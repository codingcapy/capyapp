import { pgTable, varchar, serial, timestamp } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const chats = pgTable("chats", {
  chatId: serial("chat_id").primaryKey(),
  title: varchar("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Chat = InferSelectModel<typeof chats>;
