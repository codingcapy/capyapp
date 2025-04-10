ALTER TABLE "messages" ALTER COLUMN "chat_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "content" SET DATA TYPE varchar(25000);--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "reply_user_id" SET DATA TYPE varchar(100);