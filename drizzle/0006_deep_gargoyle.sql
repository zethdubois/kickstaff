CREATE TABLE "dashboard_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hyperlink" text NOT NULL,
	"label" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_dashboard_link_preferences" (
	"user_id" uuid NOT NULL,
	"link_id" uuid NOT NULL,
	"enabled" boolean NOT NULL,
	CONSTRAINT "user_dashboard_link_preferences_user_id_link_id_pk" PRIMARY KEY("user_id","link_id")
);
--> statement-breakpoint
ALTER TABLE "user_dashboard_link_preferences" ADD CONSTRAINT "user_dashboard_link_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_dashboard_link_preferences" ADD CONSTRAINT "user_dashboard_link_preferences_link_id_dashboard_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."dashboard_links"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "dashboard_links" ("hyperlink", "label", "description", "category", "sort_order") VALUES
('https://kickasset.appfolio.com/', 'AppFolio', 'Property management system (ops access).', 'Tools', 0),
('https://docs.google.com/spreadsheets/d/1eF6Imoj7fl2hrvIJVq_qeMBOHWr-Ur1k7zCHgJPZxqA/edit?usp=sharing', 'Kickass Office Notes', 'Google Sheet: office notes + tech stack notes.', 'Sheets', 0),
('https://docs.google.com/spreadsheets/d/1r3LntyoKA1efd7ijw4C7e7tkjkEDZ6Pa/edit?usp=sharing&ouid=109307632736242833065&rtpof=true&sd=true', 'Property Expenses', 'Google Sheet: property expense category map.', 'Sheets', 1);