CREATE TABLE "chats" (
	"chat_id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"image_id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"message_id" integer,
	"user_id" varchar NOT NULL,
	"image_url" varchar NOT NULL,
	"posted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"message_id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"content" varchar(25000) NOT NULL,
	"reply_user_id" varchar(100),
	"reply_content" varchar(25000),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"reaction_id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"content" varchar(25000) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chat_read_status" (
	"user_chat_read_status_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"chat_id" integer NOT NULL,
	"last_read_message_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_chats" (
	"user_chat_id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"chat_id" integer NOT NULL,
	"last_read_message_id" integer,
	"last_read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_friends" (
	"user_friend_id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar NOT NULL,
	"friend_email" varchar NOT NULL,
	"blocked" boolean DEFAULT false,
	"muted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password" varchar NOT NULL,
	"profile_pic" varchar,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_message_id_messages_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("message_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chat_read_status" ADD CONSTRAINT "user_chat_read_status_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chat_read_status" ADD CONSTRAINT "user_chat_read_status_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chats" ADD CONSTRAINT "user_chats_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chats" ADD CONSTRAINT "user_chats_chat_id_chats_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("chat_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_chats" ADD CONSTRAINT "user_chats_last_read_message_id_messages_message_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("message_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_friends" ADD CONSTRAINT "user_friends_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "images_chat_id_idx" ON "images" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "images_message_id_idx" ON "images" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "reactions_message_id_idx" ON "reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "reactions_chat_id_idx" ON "reactions" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "user_chat_read_status_user_id_idx" ON "user_chat_read_status" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_chat_read_status_user_chat_unique_idx" ON "user_chat_read_status" USING btree ("user_id","chat_id");--> statement-breakpoint
CREATE INDEX "user_chats_user_id_idx" ON "user_chats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_chats_chat_id_idx" ON "user_chats" USING btree ("chat_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_chats_user_chat_unique_idx" ON "user_chats" USING btree ("user_id","chat_id");--> statement-breakpoint
CREATE INDEX "user_friends_user_email_idx" ON "user_friends" USING btree ("user_email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_friends_user_friend_unique_idx" ON "user_friends" USING btree ("user_email","friend_email");