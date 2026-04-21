CREATE TABLE IF NOT EXISTS "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"street_address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"notes" text,
	"bill_property_code" text NOT NULL,
	"bill_unit_name" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "unit_utility_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unit_id" uuid NOT NULL,
	"vendor" text NOT NULL,
	"city" text NOT NULL,
	"service_account_number" text NOT NULL,
	"service_address_normalized" text,
	"vendor_payee_name" text NOT NULL,
	"bill_account" text NOT NULL,
	"default_description_template" text,
	"cash_account" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "unit_utility_accounts" DROP CONSTRAINT IF EXISTS "unit_utility_accounts_unit_id_units_id_fk";--> statement-breakpoint
ALTER TABLE "unit_utility_accounts" ADD CONSTRAINT "unit_utility_accounts_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "units_bill_property_unit_uq" ON "units" USING btree ("bill_property_code","bill_unit_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "units_label_idx" ON "units" USING btree ("label");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unit_utility_accounts_vendor_account_uq" ON "unit_utility_accounts" USING btree ("vendor","service_account_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "unit_utility_accounts_unit_idx" ON "unit_utility_accounts" USING btree ("unit_id");--> statement-breakpoint
DROP TABLE IF EXISTS "utility_account_mappings";
