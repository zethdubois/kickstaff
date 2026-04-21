ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "utility_account_number" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "units_utility_account_number_uq" ON "units" USING btree ("utility_account_number");
