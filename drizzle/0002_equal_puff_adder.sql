CREATE TABLE "user_friends" (
	"user_friend_id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar NOT NULL,
	"friend_email" varchar NOT NULL,
	"blocked" boolean DEFAULT false,
	"muted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
