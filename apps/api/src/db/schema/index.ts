// Re-export from SQLite schema for types - both schemas have identical types
// The actual table references are selected in db/index.ts based on DATABASE_URL
export type {
	User,
	NewUser,
	Session,
	Profile,
	DictationEntry,
	UsageTracking,
	PolarEvent,
	WaitlistEntry,
} from "./sqlite";
