import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
	/** AppFolio property group name for embedded `/listings` iframe (filters[property_list]). */
	listingPropertyGroup: text('listing_property_group'),
	/** Same as Appfolio.Listing `themeColor` → query `theme_color`. */
	listingThemeColor: text('listing_theme_color'),
	/** Same as Appfolio.Listing `defaultOrder` → `filters[order_by]` (e.g. date_posted). */
	listingOrderBy: text('listing_order_by'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type RentalLandingLink = typeof rentalLandingLinks.$inferSelect;
