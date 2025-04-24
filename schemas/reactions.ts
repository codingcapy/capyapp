import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const reactions = pgTable("reactions", {
  reactionId: serial("reaction_id").primaryKey(),
  messageId: integer("message_id").notNull(),
  chatId: integer("chat_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: varchar("content", { length: 25000 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Reaction = InferSelectModel<typeof reactions>;
