import {
  pgTable,
  varchar,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const userFriends = pgTable("user_friends", {
  userFriendId: serial("user_friend_id").primaryKey(),
  userId: varchar("user_id").notNull(),
  friendId: varchar("friend_id").notNull(),
  blocked: boolean("blocked").default(false),
  muted: boolean("muted").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserFriend = InferSelectModel<typeof userFriends>;
