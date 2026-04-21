-- Generalize utility_bill_* -> bill_* and unit_utility_accounts -> unit_bill_accounts.
-- All renames preserve data and foreign keys. `category` defaults to 'utility' so
-- existing rows retain meaning.

ALTER TABLE "utility_bill_documents" RENAME TO "bill_documents";--> statement-breakpoint
ALTER TABLE "utility_bill_runs" RENAME TO "bill_runs";--> statement-breakpoint
ALTER TABLE "utility_bill_monthly_files" RENAME TO "bill_monthly_files";--> statement-breakpoint
ALTER TABLE "utility_bill_monthly_file_items" RENAME TO "bill_monthly_file_items";--> statement-breakpoint
ALTER TABLE "unit_utility_accounts" RENAME TO "unit_bill_accounts";--> statement-breakpoint

ALTER INDEX "utility_bill_documents_vendor_sha256_uq" RENAME TO "bill_documents_vendor_sha256_uq";--> statement-breakpoint
ALTER INDEX "utility_bill_documents_vendor_bill_reference_uq" RENAME TO "bill_documents_vendor_bill_reference_uq";--> statement-breakpoint
ALTER INDEX "utility_bill_documents_vendor_parse_status_idx" RENAME TO "bill_documents_vendor_parse_status_idx";--> statement-breakpoint
ALTER INDEX "utility_bill_runs_vendor_period_uq" RENAME TO "bill_runs_vendor_period_uq";--> statement-breakpoint
ALTER INDEX "utility_bill_monthly_files_vendor_period_uq" RENAME TO "bill_monthly_files_vendor_period_uq";--> statement-breakpoint
ALTER INDEX "utility_bill_monthly_files_status_idx" RENAME TO "bill_monthly_files_status_idx";--> statement-breakpoint
ALTER INDEX "utility_bill_monthly_file_items_document_uq" RENAME TO "bill_monthly_file_items_document_uq";--> statement-breakpoint
ALTER INDEX "unit_utility_accounts_vendor_account_uq" RENAME TO "unit_bill_accounts_vendor_account_uq";--> statement-breakpoint
ALTER INDEX "unit_utility_accounts_unit_idx" RENAME TO "unit_bill_accounts_unit_idx";--> statement-breakpoint

ALTER TABLE "bill_documents" RENAME CONSTRAINT "utility_bill_documents_storage_key_unique" TO "bill_documents_storage_key_unique";--> statement-breakpoint
ALTER TABLE "bill_monthly_file_items" RENAME CONSTRAINT "utility_bill_monthly_file_items_monthly_file_id_document_id_pk" TO "bill_monthly_file_items_monthly_file_id_document_id_pk";--> statement-breakpoint
ALTER TABLE "bill_monthly_file_items" RENAME CONSTRAINT "utility_bill_monthly_file_items_monthly_file_id_utility_bill_monthly_files_id_fk" TO "bill_monthly_file_items_monthly_file_id_bill_monthly_files_id_fk";--> statement-breakpoint
ALTER TABLE "bill_monthly_file_items" RENAME CONSTRAINT "utility_bill_monthly_file_items_document_id_utility_bill_documents_id_fk" TO "bill_monthly_file_items_document_id_bill_documents_id_fk";--> statement-breakpoint
ALTER TABLE "unit_bill_accounts" RENAME CONSTRAINT "unit_utility_accounts_unit_id_units_id_fk" TO "unit_bill_accounts_unit_id_units_id_fk";--> statement-breakpoint

ALTER TABLE "bill_documents" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'utility' NOT NULL;--> statement-breakpoint
ALTER TABLE "unit_bill_accounts" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'utility' NOT NULL;--> statement-breakpoint

ALTER TABLE "units" ADD COLUMN IF NOT EXISTS "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;
