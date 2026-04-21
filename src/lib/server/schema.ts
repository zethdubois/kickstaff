import {
	boolean,
	date,
	integer,
	jsonb,
	numeric,
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

/** Intake and parse status values for utility bill source PDFs. */
export const utilityBillParseStatuses = ['received', 'parsed', 'failed', 'skipped'] as const;
export type UtilityBillParseStatus = (typeof utilityBillParseStatuses)[number];

/** Monthly batch run status for CSV generation. */
export const utilityBillRunStatuses = ['running', 'completed', 'completed_with_errors', 'failed'] as const;
export type UtilityBillRunStatus = (typeof utilityBillRunStatuses)[number];

/** Source PDF intake + extracted fields; one row per unique document. */
export const utilityBillDocuments = pgTable(
	'utility_bill_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		vendor: text('vendor').notNull(),
		city: text('city').notNull(),
		storageKey: text('storage_key').notNull().unique(),
		sha256: text('sha256').notNull(),
		emailMessageId: text('email_message_id'),
		sourceFilename: text('source_filename').notNull(),
		serviceAccountNumber: text('service_account_number'),
		billReference: text('bill_reference'),
		billDate: date('bill_date'),
		dueDate: date('due_date'),
		servicePeriodStart: date('service_period_start'),
		servicePeriodEnd: date('service_period_end'),
		currentChargesAmount: numeric('current_charges_amount', { precision: 12, scale: 2 }),
		parseStatus: text('parse_status').notNull().default('received'),
		parseError: text('parse_error'),
		rawParseJson: jsonb('raw_parse_json'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		vendorShaUniqueIdx: uniqueIndex('utility_bill_documents_vendor_sha256_uq').on(t.vendor, t.sha256),
		vendorBillReferenceIdx: uniqueIndex('utility_bill_documents_vendor_bill_reference_uq').on(
			t.vendor,
			t.billReference
		),
		vendorStatusIdx: index('utility_bill_documents_vendor_parse_status_idx').on(t.vendor, t.parseStatus)
	})
);

/** Maps utility account number to Appfolio import defaults. */
export const utilityAccountMappings = pgTable(
	'utility_account_mappings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		vendor: text('vendor').notNull(),
		city: text('city').notNull(),
		serviceAccountNumber: text('service_account_number').notNull(),
		serviceAddressNormalized: text('service_address_normalized'),
		billPropertyCode: text('bill_property_code').notNull(),
		billUnitName: text('bill_unit_name'),
		vendorPayeeName: text('vendor_payee_name').notNull(),
		billAccount: text('bill_account').notNull(),
		defaultDescriptionTemplate: text('default_description_template'),
		cashAccount: text('cash_account'),
		active: boolean('active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		vendorAccountUniqueIdx: uniqueIndex('utility_account_mappings_vendor_account_uq').on(
			t.vendor,
			t.serviceAccountNumber
		)
	})
);

/** One row per monthly CSV generation run. */
export const utilityBillRuns = pgTable(
	'utility_bill_runs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		vendor: text('vendor').notNull(),
		city: text('city'),
		period: text('period').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		status: text('status').notNull().default('running'),
		inputDocumentCount: integer('input_document_count').notNull().default(0),
		successfulRecordCount: integer('successful_record_count').notNull().default(0),
		failedDocumentCount: integer('failed_document_count').notNull().default(0),
		outputStorageKey: text('output_storage_key'),
		totalCurrentCharges: numeric('total_current_charges', { precision: 14, scale: 2 }),
		notes: text('notes')
	},
	(t) => ({
		vendorPeriodUniqueIdx: uniqueIndex('utility_bill_runs_vendor_period_uq').on(t.vendor, t.period)
	})
);

export type User = typeof users.$inferSelect;
export type RentalLandingLink = typeof rentalLandingLinks.$inferSelect;
export type DashboardLink = typeof dashboardLinks.$inferSelect;
export type UtilityBillDocument = typeof utilityBillDocuments.$inferSelect;
export type UtilityBillAccountMapping = typeof utilityAccountMappings.$inferSelect;
export type UtilityBillRun = typeof utilityBillRuns.$inferSelect;
