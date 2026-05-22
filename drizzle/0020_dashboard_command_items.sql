ALTER TABLE "dashboard_links" ADD COLUMN "item_type" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_links" ADD COLUMN "command_key" text;--> statement-breakpoint
ALTER TABLE "dashboard_links" ALTER COLUMN "hyperlink" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_links_command_key_unique" ON "dashboard_links" USING btree ("command_key") WHERE "command_key" IS NOT NULL;
