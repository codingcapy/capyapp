import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const images = pgTable("images", {
  imageId: serial("image_id").primaryKey(),
  chatId: integer("chat_id").notNull(),
  messageId: integer("message_id"),
  userId: varchar("user_id").notNull(),
  imageUrl: varchar("image_url").notNull(),
  posted: boolean("posted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ImageMessage = InferSelectModel<typeof images>;
