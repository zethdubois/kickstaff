CREATE TABLE "utility_bill_monthly_file_items" (
	"monthly_file_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "utility_bill_monthly_file_items_monthly_file_id_document_id_pk" PRIMARY KEY("monthly_file_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "utility_bill_monthly_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor" text NOT NULL,
	"city" text,
	"period" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_key" text NOT NULL,
	"record_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "utility_bill_monthly_file_items" ADD CONSTRAINT "utility_bill_monthly_file_items_monthly_file_id_utility_bill_monthly_files_id_fk" FOREIGN KEY ("monthly_file_id") REFERENCES "public"."utility_bill_monthly_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utility_bill_monthly_file_items" ADD CONSTRAINT "utility_bill_monthly_file_items_document_id_utility_bill_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."utility_bill_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "utility_bill_monthly_file_items_document_uq" ON "utility_bill_monthly_file_items" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "utility_bill_monthly_files_vendor_period_uq" ON "utility_bill_monthly_files" USING btree ("vendor","period");--> statement-breakpoint
CREATE INDEX "utility_bill_monthly_files_status_idx" ON "utility_bill_monthly_files" USING btree ("status","created_at");