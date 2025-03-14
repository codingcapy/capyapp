CREATE TABLE "chats" (
	"chat_id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chats" (
	"user_chat_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"chat_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
