import { pgTable, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { users } from "./users";

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: varchar("id").primaryKey(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.userId, { onDelete: "cascade" }),
    // SHA-256 hash of the raw refresh token; the raw value only ever lives in
    // the client's httpOnly cookie, never at rest.
    tokenHash: varchar("token_hash").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("refresh_tokens_token_hash_idx").on(table.tokenHash)],
);

export type RefreshToken = InferSelectModel<typeof refreshTokens>;
