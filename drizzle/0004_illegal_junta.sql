CREATE TABLE "messages" (
	"message_id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer,
	"user_id" varchar,
	"content" varchar NOT NULL,
	"reply_user_id" varchar(32),
	"reply_content" varchar(25000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
