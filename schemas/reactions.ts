import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { messages } from "./messages";
import { chats } from "./chats";
import { users } from "./users";

export const reactions = pgTable(
  "reactions",
  {
    reactionId: serial("reaction_id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.messageId),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.chatId),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId),
    content: varchar("content", { length: 25000 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("reactions_message_id_idx").on(table.messageId),
    index("reactions_chat_id_idx").on(table.chatId),
  ],
);

export type Reaction = InferSelectModel<typeof reactions>;
