import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq, like, or, desc } from "drizzle-orm";
import { users, sessions, profiles, dictationHistory, type User, type Session, type Profile, type DictationEntry } from "./schema";

const sqlite = new Database("parrot.db");
export const db = drizzle(sqlite);

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    name TEXT,
    onboarding_completed INTEGER DEFAULT 0,
    setup_mode TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    custom_words TEXT DEFAULT '[]',
    context_prompt TEXT DEFAULT '',
    writing_style TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS dictation_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    cleaned_text TEXT NOT NULL DEFAULT '',
    provider TEXT NOT NULL DEFAULT 'cloud',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// User operations
export async function createUser(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const id = crypto.randomUUID();
  const passwordHash = await Bun.password.hash(password, "argon2id");

  await db.insert(users).values({
    id,
    email,
    passwordHash,
    name: name || null,
  });

  return getUserById(id)!;
}

export function createOAuthUser(
  email: string,
  googleId: string,
  name?: string
): User {
  const id = crypto.randomUUID();

  // Try to insert, or update if email exists
  const existing = getUserByEmail(email);
  if (existing) {
    db.update(users)
      .set({ googleId })
      .where(eq(users.email, email))
      .run();
    return getUserByEmail(email)!;
  }

  db.insert(users)
    .values({
      id,
      email,
      googleId,
      name: name || null,
    })
    .run();

  return getUserById(id)!;
}

export function getUserById(id: string): User | null {
  const result = db.select().from(users).where(eq(users.id, id)).get();
  return result || null;
}

export function getUserByEmail(email: string): User | null {
  const result = db.select().from(users).where(eq(users.email, email)).get();
  return result || null;
}

export function getUserByGoogleId(googleId: string): User | null {
  const result = db.select().from(users).where(eq(users.googleId, googleId)).get();
  return result || null;
}

export async function verifyPassword(
  user: User,
  password: string
): Promise<boolean> {
  if (!user.passwordHash) return false;
  return Bun.password.verify(password, user.passwordHash);
}

export function updateUserOnboarding(
  userId: string,
  completed: boolean,
  setupMode?: string
): void {
  db.update(users)
    .set({
      onboardingCompleted: completed,
      ...(setupMode && { setupMode }),
    })
    .where(eq(users.id, userId))
    .run();
}

// Session operations
export function createSession(userId: string): Session {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  db.insert(sessions).values({ id, userId, expiresAt }).run();

  return { id, userId, expiresAt };
}

export function getSession(id: string): Session | null {
  const result = db.select().from(sessions).where(eq(sessions.id, id)).get();

  if (!result) return null;

  // Check if expired
  if (new Date(result.expiresAt) < new Date()) {
    deleteSession(id);
    return null;
  }

  return result;
}

export function deleteSession(id: string): void {
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

export function deleteUserSessions(userId: string): void {
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
}

// Profile operations
export function getProfile(userId: string): Profile | null {
  const result = db.select().from(profiles).where(eq(profiles.userId, userId)).get();
  return result || null;
}

export function upsertProfile(
  userId: string,
  customWords?: string,
  contextPrompt?: string,
  writingStyle?: string
): void {
  const existing = getProfile(userId);
  if (existing) {
    db.update(profiles)
      .set({
        ...(customWords !== undefined && { customWords }),
        ...(contextPrompt !== undefined && { contextPrompt }),
        ...(writingStyle !== undefined && { writingStyle }),
      })
      .where(eq(profiles.userId, userId))
      .run();
  } else {
    db.insert(profiles)
      .values({
        userId,
        customWords: customWords || "[]",
        contextPrompt: contextPrompt || "",
        writingStyle: writingStyle || "",
      })
      .run();
  }
}

// Dictation history operations
export function insertDictation(
  userId: string,
  id: string,
  rawText: string,
  cleanedText: string,
  provider: string,
  durationMs: number
): void {
  db.insert(dictationHistory)
    .values({ id, userId, rawText, cleanedText, provider, durationMs })
    .run();
}

export function updateDictationCleaned(id: string, cleanedText: string): void {
  db.update(dictationHistory)
    .set({ cleanedText })
    .where(eq(dictationHistory.id, id))
    .run();
}

export function getHistory(userId: string): DictationEntry[] {
  return db
    .select()
    .from(dictationHistory)
    .where(eq(dictationHistory.userId, userId))
    .orderBy(desc(dictationHistory.createdAt))
    .all();
}

export function searchHistory(userId: string, query: string): DictationEntry[] {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(dictationHistory)
    .where(
      eq(dictationHistory.userId, userId)
    )
    .orderBy(desc(dictationHistory.createdAt))
    .all()
    .filter(
      (e) =>
        e.rawText.includes(query) ||
        e.cleanedText.includes(query)
    );
}
