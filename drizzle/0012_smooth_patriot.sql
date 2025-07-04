CREATE TABLE "user_chat_read_status" (
	"user_chat_read_status_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"chat_id" integer NOT NULL,
	"last_read_message_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "images" ALTER COLUMN "chat_id" SET NOT NULL;