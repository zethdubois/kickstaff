CREATE TABLE "klio_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dataset_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "klio_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "klio_conversations" ADD CONSTRAINT "klio_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klio_lines" ADD CONSTRAINT "klio_lines_conversation_id_klio_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."klio_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "klio_conversations_open_user_dataset" ON "klio_conversations" USING btree ("user_id","dataset_name") WHERE "closed_at" is null;--> statement-breakpoint
CREATE INDEX "klio_lines_conversation_ts_idx" ON "klio_lines" USING btree ("conversation_id","ts");
