CREATE TABLE "utility_account_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"city" text NOT NULL,
	"service_account_number" text NOT NULL,
	"service_address_normalized" text,
	"bill_property_code" text NOT NULL,
	"bill_unit_name" text,
	"vendor_payee_name" text NOT NULL,
	"bill_account" text NOT NULL,
	"default_description_template" text,
	"cash_account" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utility_bill_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"city" text NOT NULL,
	"storage_key" text NOT NULL,
	"sha256" text NOT NULL,
	"email_message_id" text,
	"source_filename" text NOT NULL,
	"service_account_number" text,
	"bill_reference" text,
	"bill_date" date,
	"due_date" date,
	"service_period_start" date,
	"service_period_end" date,
	"current_charges_amount" numeric(12, 2),
	"parse_status" text DEFAULT 'received' NOT NULL,
	"parse_error" text,
	"raw_parse_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utility_bill_documents_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "utility_bill_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"city" text,
	"period" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"input_document_count" integer DEFAULT 0 NOT NULL,
	"successful_record_count" integer DEFAULT 0 NOT NULL,
	"failed_document_count" integer DEFAULT 0 NOT NULL,
	"output_storage_key" text,
	"total_current_charges" numeric(14, 2),
	"notes" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "utility_account_mappings_vendor_account_uq" ON "utility_account_mappings" USING btree ("vendor","service_account_number");--> statement-breakpoint
CREATE UNIQUE INDEX "utility_bill_documents_vendor_sha256_uq" ON "utility_bill_documents" USING btree ("vendor","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "utility_bill_documents_vendor_bill_reference_uq" ON "utility_bill_documents" USING btree ("vendor","bill_reference");--> statement-breakpoint
CREATE INDEX "utility_bill_documents_vendor_parse_status_idx" ON "utility_bill_documents" USING btree ("vendor","parse_status");--> statement-breakpoint
CREATE UNIQUE INDEX "utility_bill_runs_vendor_period_uq" ON "utility_bill_runs" USING btree ("vendor","period");