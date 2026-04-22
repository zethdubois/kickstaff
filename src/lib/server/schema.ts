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

/** Known bill categories. Kept as a typed union while the DB column stays open (text). */
export const billCategories = [
	'utility',
	'insurance',
	'tax',
	'contractor',
	'hoa',
	'other'
] as const;
export type BillCategory = (typeof billCategories)[number];

/** Intake and parse status values for bill source PDFs. */
export const billParseStatuses = ['received', 'parsed', 'failed', 'skipped'] as const;
export type BillParseStatus = (typeof billParseStatuses)[number];

/** Monthly batch run status for CSV generation. */
export const billRunStatuses = [
	'running',
	'completed',
	'completed_with_errors',
	'failed'
] as const;
export type BillRunStatus = (typeof billRunStatuses)[number];

/** Queue status for monthly CSV output files. */
export const billMonthlyFileStatuses = ['pending', 'processing', 'done'] as const;
export type BillMonthlyFileStatus = (typeof billMonthlyFileStatuses)[number];

/** Source PDF intake + extracted fields; one row per unique document. */
export const billDocuments = pgTable(
	'bill_documents',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		category: text('category').notNull().default('utility'),
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
		/** Resolved at parse time from unit_bill_accounts or units.utility_account_number. */
		linkedUnitId: uuid('linked_unit_id').references(() => units.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		vendorShaUniqueIdx: uniqueIndex('bill_documents_vendor_sha256_uq').on(t.vendor, t.sha256),
		vendorBillReferenceIdx: uniqueIndex('bill_documents_vendor_bill_reference_uq').on(
			t.vendor,
			t.billReference
		),
		vendorStatusIdx: index('bill_documents_vendor_parse_status_idx').on(t.vendor, t.parseStatus),
		linkedUnitIdx: index('bill_documents_linked_unit_id_idx').on(t.linkedUnitId)
	})
);

/**
 * Real-estate units. The single source of truth for a physical address/unit and its
 * Appfolio property identifiers. Reusable beyond bill pay as new features grow.
 */
export const units = pgTable(
	'units',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		label: text('label').notNull(),
		streetAddress: text('street_address'),
		city: text('city'),
		state: text('state'),
		postalCode: text('postal_code'),
		notes: text('notes'),
		/** Optional primary utility account number for quick matching at unit level. */
		utilityAccountNumber: text('utility_account_number'),
		/** Appfolio property identifier (required for vendor bill imports). */
		billPropertyCode: text('bill_property_code').notNull(),
		/** Appfolio sub-unit name; nullable when the property is a single unit. */
		billUnitName: text('bill_unit_name'),
		/** Flex zone for experimental per-system fields before promoting to typed columns. */
		attributes: jsonb('attributes').notNull().default({}),
		active: boolean('active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		propertyUnitUniqueIdx: uniqueIndex('units_bill_property_unit_uq').on(
			t.billPropertyCode,
			t.billUnitName
		),
		labelIdx: index('units_label_idx').on(t.label),
		utilityAccountNumberUniqueIdx: uniqueIndex('units_utility_account_number_uq').on(
			t.utilityAccountNumber
		)
	})
);

/**
 * Vendor-specific bill accounts attached to a unit. A unit can have many (water,
 * power, insurance, HOA, etc.). Cross-referenced by (vendor, service_account_number)
 * during monthly batch generation; `category` tags the bill class (e.g. 'utility').
 */
export const unitBillAccounts = pgTable(
	'unit_bill_accounts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		unitId: uuid('unit_id')
			.notNull()
			.references(() => units.id, { onDelete: 'cascade' }),
		category: text('category').notNull().default('utility'),
		vendor: text('vendor').notNull(),
		city: text('city').notNull(),
		serviceAccountNumber: text('service_account_number').notNull(),
		serviceAddressNormalized: text('service_address_normalized'),
		vendorPayeeName: text('vendor_payee_name').notNull(),
		billAccount: text('bill_account').notNull(),
		defaultDescriptionTemplate: text('default_description_template'),
		cashAccount: text('cash_account'),
		active: boolean('active').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		vendorAccountUniqueIdx: uniqueIndex('unit_bill_accounts_vendor_account_uq').on(
			t.vendor,
			t.serviceAccountNumber
		),
		unitIdx: index('unit_bill_accounts_unit_idx').on(t.unitId)
	})
);

/** One row per monthly batch generation run. */
export const billRuns = pgTable(
	'bill_runs',
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
		vendorPeriodUniqueIdx: uniqueIndex('bill_runs_vendor_period_uq').on(t.vendor, t.period)
	})
);

/** Monthly CSV output files queued for bookkeeping workflow. */
export const billMonthlyFiles = pgTable(
	'bill_monthly_files',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		vendor: text('vendor').notNull(),
		city: text('city'),
		period: text('period').notNull(),
		status: text('status').notNull().default('pending'),
		storageKey: text('storage_key').notNull(),
		recordCount: integer('record_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		processedAt: timestamp('processed_at', { withTimezone: true })
	},
	(t) => ({
		vendorPeriodUniqueIdx: uniqueIndex('bill_monthly_files_vendor_period_uq').on(
			t.vendor,
			t.period
		),
		statusIdx: index('bill_monthly_files_status_idx').on(t.status, t.createdAt)
	})
);

/** Join table for documents included in a monthly output file. */
export const billMonthlyFileItems = pgTable(
	'bill_monthly_file_items',
	{
		monthlyFileId: uuid('monthly_file_id')
			.notNull()
			.references(() => billMonthlyFiles.id, { onDelete: 'cascade' }),
		documentId: uuid('document_id')
			.notNull()
			.references(() => billDocuments.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => ({
		pk: primaryKey({ columns: [t.monthlyFileId, t.documentId] }),
		documentUniqueIdx: uniqueIndex('bill_monthly_file_items_document_uq').on(t.documentId)
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
export type BillDocument = typeof billDocuments.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type UnitBillAccount = typeof unitBillAccounts.$inferSelect;
export type BillRun = typeof billRuns.$inferSelect;
export type Klog = typeof klogs.$inferSelect;
