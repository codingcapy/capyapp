import {
  pgTable,
  varchar,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const notifications = pgTable("reactions", {
  notificationId: serial("reaction_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  chatId: integer("chat_id").notNull(),
  content: varchar("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = InferSelectModel<typeof notifications>;
