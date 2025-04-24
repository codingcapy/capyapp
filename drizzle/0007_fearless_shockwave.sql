CREATE TABLE "reactions" (
	"reaction_id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"content" varchar(25000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
