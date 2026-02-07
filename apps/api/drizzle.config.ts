import { defineConfig } from "drizzle-kit";

const isPostgres =
	process.env.DATABASE_URL?.startsWith("postgres://") ||
	process.env.DATABASE_URL?.startsWith("postgresql://");

export default defineConfig(
	isPostgres
		? {
				schema: "./src/db/schema/postgres.ts",
				out: "./drizzle/postgres",
				dialect: "postgresql",
				dbCredentials: {
					url: process.env.DATABASE_URL!,
				},
			}
		: {
				schema: "./src/db/schema/sqlite.ts",
				out: "./drizzle/sqlite",
				dialect: "sqlite",
				dbCredentials: {
					url: process.env.DATABASE_URL || "./parrot.db",
				},
			},
);
