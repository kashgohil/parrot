#!/usr/bin/env bun
/**
 * Development script that runs API and desktop in parallel
 * Handles SIGTERM/SIGINT to gracefully kill child processes and their descendants
 */
/// <reference types="bun" />

interface ChildProcess {
	name: string;
	process: ReturnType<typeof Bun.spawn>;
	pid: number;
}

const children: ChildProcess[] = [];
let shuttingDown = false;

async function getChildPids(parentPid: number): Promise<number[]> {
	try {
		// Use pgrep to find child processes on macOS
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
		// pgrep might fail if no children exist
	}
	return [];
}

async function killProcessTree(pid: number, signal: string): Promise<void> {
	// Get all descendants recursively
	const visited = new Set<number>();
	const toKill: number[] = [];

	async function collectPids(p: number) {
		if (visited.has(p)) return;
		visited.add(p);
		toKill.push(p);

		const children = await getChildPids(p);
		for (const child of children) {
			await collectPids(child);
		}
	}

	await collectPids(pid);

	// Kill in reverse order (children first)
	for (const p of toKill.reverse()) {
		try {
			process.kill(p, signal);
		} catch {
			// Process may have already exited
		}
	}
}

function spawnProcess(
	name: string,
	command: string[],
	cwd?: string,
): ChildProcess {
	console.log(`[${name}] Starting...`);

	const proc = Bun.spawn(command, {
		stdio: ["inherit", "inherit", "inherit"],
		cwd,
		env: { ...process.env, FORCE_COLOR: "1" },
		onExit: (proc, exitCode, signalCode) => {
			if (shuttingDown) return;

			if (signalCode) {
				console.log(`[${name}] exited with signal ${signalCode}`);
			} else if (exitCode !== 0) {
				console.error(`[${name}] exited with code ${exitCode}`);
				shutdown();
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

async function shutdown() {
	if (shuttingDown) return;
	shuttingDown = true;

	console.log("\n[dev] Shutting down gracefully...");

	// First, try graceful shutdown with SIGTERM on the whole tree
	const termPromises = children.map(async ({ name, pid }) => {
		console.log(`[${name}] Stopping (SIGTERM)...`);
		await killProcessTree(pid, "SIGTERM");
	});

	await Promise.all(termPromises);

	// Wait a bit for processes to exit
	await new Promise((resolve) => setTimeout(resolve, 2000));

	// Force kill any remaining processes with SIGKILL
	const killPromises = children.map(async ({ name, pid }) => {
		try {
			// Check if process is still running by trying to signal 0
			process.kill(pid, 0);
			console.log(`[${name}] Force killing (SIGKILL)...`);
			await killProcessTree(pid, "SIGKILL");
		} catch {
			// Process already exited
		}
	});

	await Promise.all(killPromises);

	console.log("[dev] All processes stopped");
	process.exit(0);
}

// Handle signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// Handle uncaught errors
process.on("uncaughtException", (err) => {
	console.error("[dev] Uncaught exception:", err);
	shutdown();
});

process.on("unhandledRejection", (reason) => {
	console.error("[dev] Unhandled rejection:", reason);
	shutdown();
});

// Start processes
spawnProcess("API", ["bun", "run", "dev:api"]);
spawnProcess("Desktop", ["bun", "run", "dev:desktop"]);

console.log("[dev] Both services starting... Press Ctrl+C to stop\n");
