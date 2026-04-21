CREATE TABLE "klogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text DEFAULT 'log' NOT NULL,
	"message" text NOT NULL,
	"source" text
);
--> statement-breakpoint
ALTER TABLE "klogs" ADD CONSTRAINT "klogs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "klogs_user_ts_idx" ON "klogs" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "klogs_ts_idx" ON "klogs" USING btree ("ts");