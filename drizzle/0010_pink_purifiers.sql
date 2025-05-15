CREATE TABLE "images" (
	"image_id" serial PRIMARY KEY NOT NULL,
	"message_id" integer,
	"user_id" varchar NOT NULL,
	"image_url" varchar NOT NULL,
	"posted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
