import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  name: text("name"),
  onboardingCompleted: integer("onboarding_completed", { mode: "boolean" }).default(false),
  setupMode: text("setup_mode"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  customWords: text("custom_words").default("[]"),
  contextPrompt: text("context_prompt").default(""),
  writingStyle: text("writing_style").default(""),
});

export const dictationHistory = sqliteTable("dictation_history", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  cleanedText: text("cleaned_text").notNull().default(""),
  provider: text("provider").notNull().default("cloud"),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type DictationEntry = typeof dictationHistory.$inferSelect;
