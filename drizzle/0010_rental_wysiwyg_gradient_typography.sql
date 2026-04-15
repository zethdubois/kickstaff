ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "sidebar_tagline" text;
ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "nav_wysiwyg_gradient_from" text;
ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "nav_wysiwyg_gradient_to" text;
ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "nav_wysiwyg_gradient_angle_deg" integer;
ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "nav_wysiwyg_font_size_px" integer;
ALTER TABLE "rental_landing_links" ADD COLUMN IF NOT EXISTS "landing_wysiwyg_font_size_px" integer;
