ALTER TABLE "rental_landing_links" ADD COLUMN "mid_term_url" text;--> statement-breakpoint
ALTER TABLE "rental_landing_links" ADD COLUMN "mid_term_new_tab" boolean DEFAULT false NOT NULL;
