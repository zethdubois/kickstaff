CREATE TABLE "klio_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"dataset_name" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"calls" jsonb NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"status" text NOT NULL,
	"results" jsonb
);
--> statement-breakpoint
ALTER TABLE "klio_plans" ADD CONSTRAINT "klio_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "klio_plans_pending_user_dataset" ON "klio_plans" USING btree ("user_id","dataset_name") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "klio_plans_user_dataset_idx" ON "klio_plans" USING btree ("user_id","dataset_name","proposed_at");
