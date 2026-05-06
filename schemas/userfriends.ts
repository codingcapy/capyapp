import {
  pgTable,
  varchar,
  serial,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "./users";

export const userFriends = pgTable(
  "user_friends",
  {
    userFriendId: serial("user_friend_id").primaryKey(),
    userEmail: varchar("user_email")
      .notNull()
      .references(() => users.email),
    friendEmail: varchar("friend_email").notNull(),
    blocked: boolean("blocked").default(false),
    muted: boolean("muted").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_friends_user_email_idx").on(table.userEmail),
    uniqueIndex("user_friends_user_friend_unique_idx").on(
      table.userEmail,
      table.friendEmail,
    ),
  ],
);

export type UserFriend = InferSelectModel<typeof userFriends>;
