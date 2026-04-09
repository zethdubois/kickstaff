import { boolean, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Application roles; enforced in app code. DB stores lowercase text. */
export const userRoles = ['admin', 'user'] as const;
export type UserRole = (typeof userRoles)[number];

export const users = pgTable('users', {
	id: uuid('id').primaryKey().defaultRandom(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	role: text('role').notNull().default('user'),
	mustChangePassword: boolean('must_change_password').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = pgTable('sessions', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	tokenHash: text('token_hash').notNull().unique(),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

/** AppFolio / marketing URLs per city; editable in admin. */
export const rentalLandingLinks = pgTable('rental_landing_links', {
	citySlug: text('city_slug').primaryKey(),
	shortTermUrl: text('short_term_url'),
	longTermUrl: text('long_term_url'),
	applyUrl: text('apply_url'),
	contactUrl: text('contact_url'),
	/** Tenant-facing portal (HTTPS); shown at bottom of city rental column when set. */
	tenantPortalUrl: text('tenant_portal_url'),
	/** AppFolio property group name for embedded `/listings` iframe (filters[property_list]). */
	listingPropertyGroup: text('listing_property_group'),
	/** Same as Appfolio.Listing `themeColor` → query `theme_color`. */
	listingThemeColor: text('listing_theme_color'),
	/** Same as Appfolio.Listing `defaultOrder` → `filters[order_by]` (e.g. date_posted). */
	listingOrderBy: text('listing_order_by'),
	/** Hero image: https URL or site path e.g. /rental-media/{slug}/file.ext */
	landingHeroImageUrl: text('landing_hero_image_url'),
	/** Vertical focus for hero `background-position` Y (0 = top … 100 = bottom); null = center. */
	landingHeroBgPositionYPct: integer('landing_hero_bg_position_y_pct'),
	landingHeadline: text('landing_headline'),
	landingBody: text('landing_body'),
	/** WYSIWYG preview: left nav column (hex / font stack / px). */
	navWysiwygBg: text('nav_wysiwyg_bg'),
	navWysiwygFg: text('nav_wysiwyg_fg'),
	navWysiwygFont: text('nav_wysiwyg_font'),
	navWysiwygMaxWidthPx: integer('nav_wysiwyg_max_width_px'),
	/** WYSIWYG preview: landing main column text area. */
	landingWysiwygBg: text('landing_wysiwyg_bg'),
	landingWysiwygFg: text('landing_wysiwyg_fg'),
	landingWysiwygFont: text('landing_wysiwyg_font'),
	landingWysiwygMaxWidthPx: integer('landing_wysiwyg_max_width_px'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

/** Internal ops dashboard external links; editable in Settings. */
export const dashboardLinks = pgTable('dashboard_links', {
	id: uuid('id').primaryKey().defaultRandom(),
	hyperlink: text('hyperlink').notNull(),
	label: text('label').notNull(),
	description: text('description').notNull().default(''),
	category: text('category').notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

/** Per-user visibility; missing row means the link is shown (default on). */
export const userDashboardLinkPreferences = pgTable(
	'user_dashboard_link_preferences',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		linkId: uuid('link_id')
			.notNull()
			.references(() => dashboardLinks.id, { onDelete: 'cascade' }),
		enabled: boolean('enabled').notNull()
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.linkId] })
	})
);

export type User = typeof users.$inferSelect;
export type RentalLandingLink = typeof rentalLandingLinks.$inferSelect;
export type DashboardLink = typeof dashboardLinks.$inferSelect;
