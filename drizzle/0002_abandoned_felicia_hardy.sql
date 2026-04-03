CREATE TABLE "rental_landing_links" (
	"city_slug" text PRIMARY KEY NOT NULL,
	"short_term_url" text,
	"long_term_url" text,
	"apply_url" text,
	"contact_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
