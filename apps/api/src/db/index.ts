import { and, desc, eq } from "drizzle-orm";
import type {
	DictationEntry,
	Profile,
	Session,
	User,
	WaitlistEntry,
} from "./schema";

// Re-export types
export type { DictationEntry, Profile, Session, User, WaitlistEntry };

// Determine database type from DATABASE_URL
const isPostgres =
	process.env.DATABASE_URL?.startsWith("postgres://") ||
	process.env.DATABASE_URL?.startsWith("postgresql://");

// Database abstraction interface
interface DbOperations {
	createUser(email: string, password: string, name?: string): Promise<User>;
	createOAuthUser(
		email: string,
		googleId: string,
		name?: string,
	): Promise<User>;
	getUserById(id: string): Promise<User | null>;
	getUserByEmail(email: string): Promise<User | null>;
	getUserByGoogleId(googleId: string): Promise<User | null>;
	updateUserOnboarding(
		userId: string,
		completed: boolean,
		setupMode?: string,
	): Promise<void>;
	createSession(userId: string): Promise<Session>;
	getSession(id: string): Promise<Session | null>;
	deleteSession(id: string): Promise<void>;
	deleteUserSessions(userId: string): Promise<void>;
	getProfile(userId: string): Promise<Profile | null>;
	upsertProfile(
		userId: string,
		customWords?: string,
		contextPrompt?: string,
		writingStyle?: string,
	): Promise<void>;
	insertDictation(
		userId: string,
		id: string,
		rawText: string,
		cleanedText: string,
		provider: string,
		durationMs: number,
	): Promise<void>;
	updateDictationCleaned(id: string, cleanedText: string): Promise<void>;
	getHistory(userId: string): Promise<DictationEntry[]>;
	updateDictationAudioUrl(id: string, audioUrl: string): Promise<void>;
	updateUserSubscription(
		userId: string,
		data: {
			subscriptionTier?: string;
			polarCustomerId?: string;
			polarSubscriptionId?: string;
			subscriptionStatus?: string | null;
			subscriptionExpiresAt?: string | null;
			trialEndsAt?: string | null;
		},
	): Promise<void>;
	getUserByPolarCustomerId(customerId: string): Promise<User | null>;
	getOrCreateUsage(
		userId: string,
		month: string,
	): Promise<{
		id: string;
		transcriptionMinutes: number | null;
		cleanupRequests: number | null;
	}>;
	incrementUsage(
		userId: string,
		type: "transcriptionMinutes" | "cleanupRequests",
		amount: number,
	): Promise<void>;
	hasPolarEvent(eventId: string): Promise<boolean>;
	insertPolarEvent(
		eventId: string,
		type: string,
		payload: string,
	): Promise<void>;
	searchHistory(userId: string, query: string): Promise<DictationEntry[]>;
	addToWaitlist(email: string, source?: string): Promise<WaitlistEntry>;
	getWaitlistEntry(email: string): Promise<WaitlistEntry | null>;
	getWaitlistCount(): Promise<number>;
	getAllWaitlistEntries(): Promise<WaitlistEntry[]>;
}

// Initialize the appropriate database implementation
let dbOps: DbOperations;

if (isPostgres) {
	// PostgreSQL implementation
	const postgres = (await import("postgres")).default;
	const { drizzle } = await import("drizzle-orm/postgres-js");
	const {
		users,
		sessions,
		profiles,
		dictationHistory,
		usageTracking,
		polarEvents,
		waitlist,
	} = await import("./schema/postgres");

	const client = postgres(process.env.DATABASE_URL!);
	const db = drizzle(client);

	dbOps = {
		async createUser(email, password, name) {
			const id = crypto.randomUUID();
			const passwordHash = await Bun.password.hash(password, "argon2id");
			await db
				.insert(users)
				.values({ id, email, passwordHash, name: name || null });
			const user = await this.getUserById(id);
			if (!user) throw new Error("Failed to create user");
			return user;
		},
		async createOAuthUser(email, googleId, name) {
			const id = crypto.randomUUID();
			const existing = await this.getUserByEmail(email);
			if (existing) {
				await db.update(users).set({ googleId }).where(eq(users.email, email));
				const updated = await this.getUserByEmail(email);
				if (!updated) throw new Error("Failed to update user");
				return updated;
			}
			await db
				.insert(users)
				.values({ id, email, googleId, name: name || null });
			const user = await this.getUserById(id);
			if (!user) throw new Error("Failed to create user");
			return user;
		},
		async getUserById(id) {
			const [result] = await db.select().from(users).where(eq(users.id, id));
			return result
				? ({
						...result,
						createdAt: result.createdAt?.toISOString() ?? null,
					} as User)
				: null;
		},
		async getUserByEmail(email) {
			const [result] = await db
				.select()
				.from(users)
				.where(eq(users.email, email));
			return result
				? ({
						...result,
						createdAt: result.createdAt?.toISOString() ?? null,
					} as User)
				: null;
		},
		async getUserByGoogleId(googleId) {
			const [result] = await db
				.select()
				.from(users)
				.where(eq(users.googleId, googleId));
			return result
				? ({
						...result,
						createdAt: result.createdAt?.toISOString() ?? null,
					} as User)
				: null;
		},
		async updateUserOnboarding(userId, completed, setupMode) {
			await db
				.update(users)
				.set({
					onboardingCompleted: completed,
					...(setupMode && { setupMode }),
				})
				.where(eq(users.id, userId));
		},
		async createSession(userId) {
			const id = crypto.randomUUID();
			const expiresAt = new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000,
			).toISOString();
			await db.insert(sessions).values({ id, userId, expiresAt });
			return { id, userId, expiresAt };
		},
		async getSession(id) {
			const [result] = await db
				.select()
				.from(sessions)
				.where(eq(sessions.id, id));
			if (!result) return null;
			if (new Date(result.expiresAt) < new Date()) {
				await this.deleteSession(id);
				return null;
			}
			return result;
		},
		async deleteSession(id) {
			await db.delete(sessions).where(eq(sessions.id, id));
		},
		async deleteUserSessions(userId) {
			await db.delete(sessions).where(eq(sessions.userId, userId));
		},
		async getProfile(userId) {
			const [result] = await db
				.select()
				.from(profiles)
				.where(eq(profiles.userId, userId));
			return result || null;
		},
		async upsertProfile(userId, customWords, contextPrompt, writingStyle) {
			const existing = await this.getProfile(userId);
			if (existing) {
				await db
					.update(profiles)
					.set({
						...(customWords !== undefined && { customWords }),
						...(contextPrompt !== undefined && { contextPrompt }),
						...(writingStyle !== undefined && { writingStyle }),
					})
					.where(eq(profiles.userId, userId));
			} else {
				await db.insert(profiles).values({
					userId,
					customWords: customWords || "[]",
					contextPrompt: contextPrompt || "",
					writingStyle: writingStyle || "",
				});
			}
		},
		async insertDictation(
			userId,
			id,
			rawText,
			cleanedText,
			provider,
			durationMs,
		) {
			await db
				.insert(dictationHistory)
				.values({ id, userId, rawText, cleanedText, provider, durationMs });
		},
		async updateDictationCleaned(id, cleanedText) {
			await db
				.update(dictationHistory)
				.set({ cleanedText })
				.where(eq(dictationHistory.id, id));
		},
		async getHistory(userId) {
			const results = await db
				.select()
				.from(dictationHistory)
				.where(eq(dictationHistory.userId, userId))
				.orderBy(desc(dictationHistory.createdAt));
			return results.map((r) => ({
				...r,
				createdAt: r.createdAt?.toISOString() ?? null,
			})) as DictationEntry[];
		},
		async updateDictationAudioUrl(id, audioUrl) {
			await db
				.update(dictationHistory)
				.set({ audioUrl })
				.where(eq(dictationHistory.id, id));
		},
		async updateUserSubscription(userId, data) {
			await db.update(users).set(data).where(eq(users.id, userId));
		},
		async getUserByPolarCustomerId(customerId) {
			const [result] = await db
				.select()
				.from(users)
				.where(eq(users.polarCustomerId, customerId));
			return result
				? ({
						...result,
						createdAt: result.createdAt?.toISOString() ?? null,
					} as User)
				: null;
		},
		async getOrCreateUsage(userId, month) {
			let [record] = await db
				.select()
				.from(usageTracking)
				.where(
					and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)),
				);
			if (!record) {
				const id = crypto.randomUUID();
				await db.insert(usageTracking).values({ id, userId, month });
				[record] = await db
					.select()
					.from(usageTracking)
					.where(eq(usageTracking.id, id));
			}
			return record;
		},
		async incrementUsage(userId, type, amount) {
			const month = new Date().toISOString().slice(0, 7);
			const usage = await this.getOrCreateUsage(userId, month);
			const current =
				(type === "transcriptionMinutes"
					? usage.transcriptionMinutes
					: usage.cleanupRequests) || 0;
			await db
				.update(usageTracking)
				.set({
					[type]: current + amount,
				})
				.where(eq(usageTracking.id, usage.id));
		},
		async hasPolarEvent(eventId) {
			const [result] = await db
				.select()
				.from(polarEvents)
				.where(eq(polarEvents.id, eventId));
			return !!result;
		},
		async insertPolarEvent(eventId, type, payload) {
			await db.insert(polarEvents).values({ id: eventId, type, payload });
		},
		async searchHistory(userId, query) {
			const results = await db
				.select()
				.from(dictationHistory)
				.where(eq(dictationHistory.userId, userId))
				.orderBy(desc(dictationHistory.createdAt));
			return results
				.filter(
					(e) => e.rawText.includes(query) || e.cleanedText.includes(query),
				)
				.map((r) => ({
					...r,
					createdAt: r.createdAt?.toISOString() ?? null,
				})) as DictationEntry[];
		},
		async addToWaitlist(email, source) {
			const id = crypto.randomUUID();
			await db
				.insert(waitlist)
				.values({ id, email, source: source || "website" });
			return {
				id,
				email,
				source: source || "website",
				createdAt: new Date().toISOString(),
			};
		},
		async getWaitlistEntry(email) {
			const [result] = await db
				.select()
				.from(waitlist)
				.where(eq(waitlist.email, email));
			return result
				? ({
						...result,
						createdAt: result.createdAt?.toISOString() ?? null,
					} as WaitlistEntry)
				: null;
		},
		async getWaitlistCount() {
			const results = await db.select().from(waitlist);
			return results.length;
		},
		async getAllWaitlistEntries() {
			const results = await db
				.select()
				.from(waitlist)
				.orderBy(desc(waitlist.createdAt));
			return results.map((r) => ({
				...r,
				createdAt: r.createdAt?.toISOString() ?? null,
			})) as WaitlistEntry[];
		},
	};
} else {
	// SQLite implementation
	const { Database } = await import("bun:sqlite");
	const { drizzle } = await import("drizzle-orm/bun-sqlite");
	const {
		users,
		sessions,
		profiles,
		dictationHistory,
		usageTracking,
		polarEvents,
		waitlist,
	} = await import("./schema/sqlite");

	const sqlite = new Database(process.env.DATABASE_URL || "parrot.db");
	const db = drizzle(sqlite);

	dbOps = {
		async createUser(email, password, name) {
			const id = crypto.randomUUID();
			const passwordHash = await Bun.password.hash(password, "argon2id");
			db.insert(users)
				.values({ id, email, passwordHash, name: name || null })
				.run();
			const user = await this.getUserById(id);
			if (!user) throw new Error("Failed to create user");
			return user;
		},
		async createOAuthUser(email, googleId, name) {
			const id = crypto.randomUUID();
			const existing = await this.getUserByEmail(email);
			if (existing) {
				db.update(users).set({ googleId }).where(eq(users.email, email)).run();
				const updated = await this.getUserByEmail(email);
				if (!updated) throw new Error("Failed to update user");
				return updated;
			}
			db.insert(users)
				.values({ id, email, googleId, name: name || null })
				.run();
			const user = await this.getUserById(id);
			if (!user) throw new Error("Failed to create user");
			return user;
		},
		async getUserById(id) {
			const result = db.select().from(users).where(eq(users.id, id)).get();
			return result || null;
		},
		async getUserByEmail(email) {
			const result = db
				.select()
				.from(users)
				.where(eq(users.email, email))
				.get();
			return result || null;
		},
		async getUserByGoogleId(googleId) {
			const result = db
				.select()
				.from(users)
				.where(eq(users.googleId, googleId))
				.get();
			return result || null;
		},
		async updateUserOnboarding(userId, completed, setupMode) {
			db.update(users)
				.set({
					onboardingCompleted: completed,
					...(setupMode && { setupMode }),
				})
				.where(eq(users.id, userId))
				.run();
		},
		async createSession(userId) {
			const id = crypto.randomUUID();
			const expiresAt = new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000,
			).toISOString();
			db.insert(sessions).values({ id, userId, expiresAt }).run();
			return { id, userId, expiresAt };
		},
		async getSession(id) {
			const result = db
				.select()
				.from(sessions)
				.where(eq(sessions.id, id))
				.get();
			if (!result) return null;
			if (new Date(result.expiresAt) < new Date()) {
				await this.deleteSession(id);
				return null;
			}
			return result;
		},
		async deleteSession(id) {
			db.delete(sessions).where(eq(sessions.id, id)).run();
		},
		async deleteUserSessions(userId) {
			db.delete(sessions).where(eq(sessions.userId, userId)).run();
		},
		async getProfile(userId) {
			const result = db
				.select()
				.from(profiles)
				.where(eq(profiles.userId, userId))
				.get();
			return result || null;
		},
		async upsertProfile(userId, customWords, contextPrompt, writingStyle) {
			const existing = await this.getProfile(userId);
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
		},
		async insertDictation(
			userId,
			id,
			rawText,
			cleanedText,
			provider,
			durationMs,
		) {
			db.insert(dictationHistory)
				.values({ id, userId, rawText, cleanedText, provider, durationMs })
				.run();
		},
		async updateDictationCleaned(id, cleanedText) {
			db.update(dictationHistory)
				.set({ cleanedText })
				.where(eq(dictationHistory.id, id))
				.run();
		},
		async getHistory(userId) {
			return db
				.select()
				.from(dictationHistory)
				.where(eq(dictationHistory.userId, userId))
				.orderBy(desc(dictationHistory.createdAt))
				.all();
		},
		async updateDictationAudioUrl(id, audioUrl) {
			db.update(dictationHistory)
				.set({ audioUrl })
				.where(eq(dictationHistory.id, id))
				.run();
		},
		async updateUserSubscription(userId, data) {
			db.update(users).set(data).where(eq(users.id, userId)).run();
		},
		async getUserByPolarCustomerId(customerId) {
			const result = db
				.select()
				.from(users)
				.where(eq(users.polarCustomerId, customerId))
				.get();
			return result || null;
		},
		async getOrCreateUsage(userId, month) {
			let record = db
				.select()
				.from(usageTracking)
				.where(
					and(eq(usageTracking.userId, userId), eq(usageTracking.month, month)),
				)
				.get();
			if (!record) {
				const id = crypto.randomUUID();
				db.insert(usageTracking).values({ id, userId, month }).run();
				record = db
					.select()
					.from(usageTracking)
					.where(eq(usageTracking.id, id))
					.get()!;
			}
			return record;
		},
		async incrementUsage(userId, type, amount) {
			const month = new Date().toISOString().slice(0, 7);
			const usage = await this.getOrCreateUsage(userId, month);
			const current =
				(type === "transcriptionMinutes"
					? usage.transcriptionMinutes
					: usage.cleanupRequests) || 0;
			db.update(usageTracking)
				.set({
					[type]: current + amount,
				})
				.where(eq(usageTracking.id, usage.id))
				.run();
		},
		async hasPolarEvent(eventId) {
			const result = db
				.select()
				.from(polarEvents)
				.where(eq(polarEvents.id, eventId))
				.get();
			return !!result;
		},
		async insertPolarEvent(eventId, type, payload) {
			db.insert(polarEvents).values({ id: eventId, type, payload }).run();
		},
		async searchHistory(userId, query) {
			const results = db
				.select()
				.from(dictationHistory)
				.where(eq(dictationHistory.userId, userId))
				.orderBy(desc(dictationHistory.createdAt))
				.all();
			return results.filter(
				(e) => e.rawText.includes(query) || e.cleanedText.includes(query),
			);
		},
		async addToWaitlist(email, source) {
			const id = crypto.randomUUID();
			db.insert(waitlist)
				.values({ id, email, source: source || "website" })
				.run();
			return {
				id,
				email,
				source: source || "website",
				createdAt: new Date().toISOString(),
			};
		},
		async getWaitlistEntry(email) {
			const result = db
				.select()
				.from(waitlist)
				.where(eq(waitlist.email, email))
				.get();
			return result || null;
		},
		async getWaitlistCount() {
			const results = db.select().from(waitlist).all();
			return results.length;
		},
		async getAllWaitlistEntries() {
			return db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).all();
		},
	};
}

// Export functions that delegate to the appropriate implementation
export const createUser = dbOps.createUser.bind(dbOps);
export const createOAuthUser = dbOps.createOAuthUser.bind(dbOps);
export const getUserById = dbOps.getUserById.bind(dbOps);
export const getUserByEmail = dbOps.getUserByEmail.bind(dbOps);
export const getUserByGoogleId = dbOps.getUserByGoogleId.bind(dbOps);
export const updateUserOnboarding = dbOps.updateUserOnboarding.bind(dbOps);
export const createSession = dbOps.createSession.bind(dbOps);
export const getSession = dbOps.getSession.bind(dbOps);
export const deleteSession = dbOps.deleteSession.bind(dbOps);
export const deleteUserSessions = dbOps.deleteUserSessions.bind(dbOps);
export const getProfile = dbOps.getProfile.bind(dbOps);
export const upsertProfile = dbOps.upsertProfile.bind(dbOps);
export const insertDictation = dbOps.insertDictation.bind(dbOps);
export const updateDictationCleaned = dbOps.updateDictationCleaned.bind(dbOps);
export const getHistory = dbOps.getHistory.bind(dbOps);
export const updateDictationAudioUrl =
	dbOps.updateDictationAudioUrl.bind(dbOps);
export const updateUserSubscription = dbOps.updateUserSubscription.bind(dbOps);
export const getUserByPolarCustomerId =
	dbOps.getUserByPolarCustomerId.bind(dbOps);
export const getOrCreateUsage = dbOps.getOrCreateUsage.bind(dbOps);
export const incrementUsage = dbOps.incrementUsage.bind(dbOps);
export const hasPolarEvent = dbOps.hasPolarEvent.bind(dbOps);
export const insertPolarEvent = dbOps.insertPolarEvent.bind(dbOps);
export const searchHistory = dbOps.searchHistory.bind(dbOps);
export const addToWaitlist = dbOps.addToWaitlist.bind(dbOps);
export const getWaitlistEntry = dbOps.getWaitlistEntry.bind(dbOps);
export const getWaitlistCount = dbOps.getWaitlistCount.bind(dbOps);
export const getAllWaitlistEntries = dbOps.getAllWaitlistEntries.bind(dbOps);

// Also export verifyPassword which doesn't need DB
export async function verifyPassword(
	user: User,
	password: string,
): Promise<boolean> {
	if (!user.passwordHash) return false;
	return Bun.password.verify(password, user.passwordHash);
}
