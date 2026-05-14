ALTER TABLE "rental_landing_links" ADD COLUMN "short_term_new_tab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_landing_links" ADD COLUMN "long_term_new_tab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_landing_links" ADD COLUMN "apply_new_tab" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rental_landing_links" ADD COLUMN "contact_new_tab" boolean DEFAULT false NOT NULL;