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
import { messages } from "./messages";
import { users } from "./users";

export const images = pgTable(
  "images",
  {
    imageId: serial("image_id").primaryKey(),
    chatId: integer("chat_id")
      .notNull()
      .references(() => chats.chatId),
    messageId: integer("message_id").references(() => messages.messageId),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId),
    imageUrl: varchar("image_url").notNull(),
    posted: boolean("posted").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("images_chat_id_idx").on(table.chatId),
    index("images_message_id_idx").on(table.messageId),
  ],
);

export type ImageMessage = InferSelectModel<typeof images>;
