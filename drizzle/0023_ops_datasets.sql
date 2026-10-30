-- Ops datasets + per-user grants (product database).
-- Connection strings are host secrets; never expose to the browser.
CREATE TABLE IF NOT EXISTS "ops_datasets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"connection_string" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ops_datasets_name_unique" ON "ops_datasets" USING btree ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ops_dataset_grants" (
	"user_id" uuid NOT NULL,
	"dataset_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ops_dataset_grants_user_id_dataset_name_pk" PRIMARY KEY("user_id","dataset_name")
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "ops_dataset_grants" ADD CONSTRAINT "ops_dataset_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ops_dataset_grants_user_idx" ON "ops_dataset_grants" USING btree ("user_id");
