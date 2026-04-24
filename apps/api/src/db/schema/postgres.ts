import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: text("id").primaryKey(),
	email: text("email").unique().notNull(),
	passwordHash: text("password_hash"),
	googleId: text("google_id").unique(),
	name: text("name"),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	setupMode: text("setup_mode"),
	subscriptionTier: text("subscription_tier").default("local"),
	polarCustomerId: text("polar_customer_id"),
	polarSubscriptionId: text("polar_subscription_id"),
	subscriptionStatus: text("subscription_status"),
	subscriptionExpiresAt: text("subscription_expires_at"),
	trialEndsAt: text("trial_ends_at"),
	migrationPaidAt: text("migration_paid_at"),
	migrationCompletedAt: text("migration_completed_at"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: text("expires_at").notNull(),
});

export const profiles = pgTable("profiles", {
	userId: text("user_id")
		.primaryKey()
		.references(() => users.id, { onDelete: "cascade" }),
	customWords: text("custom_words").default("[]"),
	contextPrompt: text("context_prompt").default(""),
	writingStyle: text("writing_style").default(""),
});

export const dictationHistory = pgTable("dictation_history", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	rawText: text("raw_text").notNull(),
	cleanedText: text("cleaned_text").notNull().default(""),
	provider: text("provider").notNull().default("cloud"),
	durationMs: integer("duration_ms").notNull().default(0),
	audioUrl: text("audio_url"),
	createdAt: timestamp("created_at").defaultNow(),
});

export const usageTracking = pgTable("usage_tracking", {
	id: text("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	month: text("month").notNull(), // "YYYY-MM"
	transcriptionMinutes: integer("transcription_minutes").default(0),
	cleanupRequests: integer("cleanup_requests").default(0),
	createdAt: timestamp("created_at").defaultNow(),
});

export const polarEvents = pgTable("polar_events", {
	id: text("id").primaryKey(),
	type: text("type").notNull(),
	processedAt: timestamp("processed_at").defaultNow(),
	payload: text("payload").notNull(),
});

export const waitlist = pgTable("waitlist", {
	id: text("id").primaryKey(),
	email: text("email").unique().notNull(),
	source: text("source").default("website"),
	createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type DictationEntry = typeof dictationHistory.$inferSelect;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type PolarEvent = typeof polarEvents.$inferSelect;
export type WaitlistEntry = typeof waitlist.$inferSelect;
