import {
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const messageReads = pgTable("message_reads", {
  messageReadId: serial("message_read_id").primaryKey(),
  messageId: integer("message_id").notNull(),
  userId: varchar("user_id").notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
});

export type MessageRead = InferSelectModel<typeof messageReads>;
