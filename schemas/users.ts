import { pgTable, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    userId: varchar("user_id").primaryKey(),
    username: varchar("username").notNull(),
    email: varchar("email").notNull(),
    password: varchar("password").notNull(),
    profilePic: varchar("profile_pic"),
    status: varchar("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  // A real UNIQUE constraint (not just a unique index) so other tables can
  // have a foreign key reference users.email (Postgres requires a unique
  // constraint/PK, not merely a unique index, as an FK target).
  (table) => [unique("users_email_unique").on(table.email)],
);

export type User = InferSelectModel<typeof users>;
