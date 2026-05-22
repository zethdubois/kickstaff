import {
	boolean,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid,
	uniqueIndex,
	index
} from 'drizzle-orm/pg-core';

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
	/** Open link in a new tab instead of the iframe. */
	shortTermNewTab: boolean('short_term_new_tab').notNull().default(false),
	/** Open link in a new tab instead of the iframe. */
	longTermNewTab: boolean('long_term_new_tab').notNull().default(false),
	/** Open link in a new tab instead of the iframe. */
	applyNewTab: boolean('apply_new_tab').notNull().default(false),
	/** Open link in a new tab instead of the iframe. */
	contactNewTab: boolean('contact_new_tab').notNull().default(false),
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
	/** Optional subtitle under city title; null = use page default copy. */
	sidebarTagline: text('sidebar_tagline'),
	/** WYSIWYG preview: left nav column (hex / font stack / px). */
	navWysiwygBg: text('nav_wysiwyg_bg'),
	navWysiwygFg: text('nav_wysiwyg_fg'),
	navWysiwygFont: text('nav_wysiwyg_font'),
	navWysiwygMaxWidthPx: integer('nav_wysiwyg_max_width_px'),
	navWysiwygGradientFrom: text('nav_wysiwyg_gradient_from'),
	navWysiwygGradientTo: text('nav_wysiwyg_gradient_to'),
	navWysiwygGradientAngleDeg: integer('nav_wysiwyg_gradient_angle_deg'),
	navWysiwygFontSizePx: integer('nav_wysiwyg_font_size_px'),
	/** WYSIWYG preview: landing main column text area. */
	landingWysiwygBg: text('landing_wysiwyg_bg'),
	landingWysiwygFg: text('landing_wysiwyg_fg'),
	landingWysiwygFont: text('landing_wysiwyg_font'),
	landingWysiwygMaxWidthPx: integer('landing_wysiwyg_max_width_px'),
	landingWysiwygFontSizePx: integer('landing_wysiwyg_font_size_px'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const dashboardItemTypes = ['link', 'command'] as const;
export type DashboardItemType = (typeof dashboardItemTypes)[number];

/** Internal ops dashboard links and materialized command cards; editable in Settings. */
export const dashboardLinks = pgTable(
	'dashboard_links',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		itemType: text('item_type').notNull().default('link').$type<DashboardItemType>(),
		commandKey: text('command_key'),
		hyperlink: text('hyperlink'),
		label: text('label').notNull(),
		description: text('description').notNull().default(''),
		category: text('category').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		commandKeyUnique: uniqueIndex('dashboard_links_command_key_unique').on(t.commandKey)
	})
);

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

/** Allowed klog levels. Stored as text; value array is the source of truth. */
export const klogLevels = ['log', 'info', 'warn', 'error'] as const;
export type KlogLevel = (typeof klogLevels)[number];

/**
 * Persistent dev-console log entries (KAM Console pane + command palette).
 * Per-user audit with 30-day retention (pruned on write by the ingest endpoint).
 */
export const klogs = pgTable(
	'klogs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
		ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
		level: text('level').notNull().default('log'),
		message: text('message').notNull(),
		source: text('source')
	},
	(t) => ({
		userTsIdx: index('klogs_user_ts_idx').on(t.userId, t.ts),
		tsIdx: index('klogs_ts_idx').on(t.ts)
	})
);

export type User = typeof users.$inferSelect;
export type RentalLandingLink = typeof rentalLandingLinks.$inferSelect;
export type DashboardLink = typeof dashboardLinks.$inferSelect;
export type Klog = typeof klogs.$inferSelect;
