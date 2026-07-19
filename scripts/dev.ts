#!/usr/bin/env bun
/**
 * Development orchestrator (repo root).
 *
 * Default: desktop (Tauri).
 *   bun run dev
 *   bun run dev -- --desktop-only
 *   bun run dev -- --with-hero
 *   bun run dev -- --hero-only
 *
 * Desktop is spawned from apps/desktop with its .env so Tauri signing
 * keys and Vite vars load correctly.
 *
 * Handles SIGTERM/SIGINT to gracefully kill child process trees.
 */
/// <reference types="bun" />

interface ChildProcess {
	name: string;
	process: ReturnType<typeof Bun.spawn>;
	pid: number;
}

const children: ChildProcess[] = [];
let shuttingDown = false;

const root = new URL("..", import.meta.url).pathname;
const desktopDir = `${root}/apps/desktop`;

function parseArgs(argv: string[]) {
	const flags = new Set(argv);
	return {
		desktopOnly: flags.has("--desktop-only"),
		heroOnly: flags.has("--hero-only"),
		withHero: flags.has("--with-hero"),
	};
}

async function getChildPids(parentPid: number): Promise<number[]> {
	try {
		const proc = Bun.spawn(["pgrep", "-P", parentPid.toString()], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;

		if (output.trim()) {
			return output
				.trim()
				.split("\n")
				.map((pid) => Number.parseInt(pid.trim(), 10))
				.filter((pid) => !Number.isNaN(pid));
		}
	} catch {
		// no children
	}
	return [];
}

async function killProcessTree(pid: number, signal: string): Promise<void> {
	const visited = new Set<number>();
	const toKill: number[] = [];

	async function collectPids(p: number) {
		if (visited.has(p)) return;
		visited.add(p);
		toKill.push(p);
		const kids = await getChildPids(p);
		for (const child of kids) {
			await collectPids(child);
		}
	}

	await collectPids(pid);

	for (const p of toKill.reverse()) {
		try {
			process.kill(p, signal);
		} catch {
			// already gone
		}
	}
}

function spawnProcess(
	name: string,
	command: string[],
	opts?: { cwd?: string; env?: Record<string, string | undefined> },
): ChildProcess {
	console.log(`[${name}] Starting: ${command.join(" ")}`);

	const proc = Bun.spawn(command, {
		stdio: ["inherit", "inherit", "inherit"],
		cwd: opts?.cwd,
		env: {
			...process.env,
			...opts?.env,
			FORCE_COLOR: "1",
		},
		onExit: (_proc, exitCode, signalCode) => {
			if (shuttingDown) return;
			if (signalCode) {
				console.log(`[${name}] exited with signal ${signalCode}`);
			} else if (exitCode !== 0 && exitCode !== null) {
				console.error(`[${name}] exited with code ${exitCode}`);
				void shutdown();
			}
		},
	});

	const child: ChildProcess = {
		name,
		process: proc,
		pid: proc.pid,
	};
	children.push(child);
	return child;
}

async function loadDesktopEnv(): Promise<Record<string, string>> {
	const envPath = `${desktopDir}/.env`;
	const file = Bun.file(envPath);
	if (!(await file.exists())) {
		console.warn(
			`[dev] No ${envPath} — desktop will run without TAURI_/VITE_ secrets`,
		);
		return {};
	}
	const text = await file.text();
	const out: Record<string, string> = {};
	for (const line of text.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq <= 0) continue;
		const key = trimmed.slice(0, eq).trim();
		let val = trimmed.slice(eq + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		out[key] = val;
	}
	return out;
}

async function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;

	console.log("\n[dev] Shutting down gracefully...");

	await Promise.all(
		children.map(async ({ name, pid }) => {
			console.log(`[${name}] Stopping (SIGTERM)...`);
			await killProcessTree(pid, "SIGTERM");
		}),
	);

	await new Promise((resolve) => setTimeout(resolve, 2000));

	await Promise.all(
		children.map(async ({ name, pid }) => {
			try {
				process.kill(pid, 0);
				console.log(`[${name}] Force killing (SIGKILL)...`);
				await killProcessTree(pid, "SIGKILL");
			} catch {
				// exited
			}
		}),
	);

	console.log("[dev] All processes stopped");
	process.exit(0);
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
process.on("uncaughtException", (err) => {
	console.error("[dev] Uncaught exception:", err);
	void shutdown();
});
process.on("unhandledRejection", (reason) => {
	console.error("[dev] Unhandled rejection:", reason);
	void shutdown();
});

const args = parseArgs(process.argv.slice(2));
const startDesktop = !args.heroOnly;
const startHero = args.withHero || args.heroOnly;

if (startDesktop) {
	const desktopEnv = await loadDesktopEnv();
	// Prefer apps/desktop/.env over shell env for Tauri keys
	spawnProcess("Desktop", ["bun", "run", "desktop", "dev"], {
		cwd: desktopDir,
		env: { ...process.env, ...desktopEnv },
	});
}

if (startHero) {
	spawnProcess("Hero", ["bun", "run", "dev:hero"], { cwd: root });
}

const parts = [
	startDesktop && "Desktop (Tauri)",
	startHero && "Hero :3002",
]
	.filter(Boolean)
	.join(" + ");

console.log(`[dev] Starting ${parts}. Press Ctrl+C to stop.\n`);
console.log(
	"[dev] Tip: quit the App Store/DMG Parrot first so hotkeys and com.kash.parrot data don't clash.\n",
);
