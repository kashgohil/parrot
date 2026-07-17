import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	LogicalPosition,
	LogicalSize,
	currentMonitor,
	getCurrentWindow,
} from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type HudStatus =
	| "idle"
	| "recording"
	| "transcribing"
	| "cleaning"
	| "cleanup-ready";

// Two outer shapes only — the orb (idle) and the active chip. The chip stays
// mounted across recording/transcribing/cleaning, with only its inner content
// swapping. Avoids the pop-out/pop-in jitter of remounting between states.
// cleanup-ready is wider so "⌘⇧C polish" fits without truncating.
// streaming expands further when live partial text is available.
const SIZES: Record<
	"idle" | "active" | "cleanup-ready" | "streaming",
	{ w: number; h: number }
> = {
	idle: { w: 36, h: 36 },
	active: { w: 160, h: 34 },
	"cleanup-ready": { w: 148, h: 34 },
	streaming: { w: 280, h: 34 },
};

const CLEANUP_READY_MS = 8_000;

const MARGIN = 24;
const DRAG_THRESHOLD = 4;

export function HudOrb() {
	const [status, setStatus] = useState<HudStatus>("idle");
	const [partial, setPartial] = useState("");
	const placed = useRef(false);
	const cleanupReadyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const clearCleanupTimer = () => {
			if (cleanupReadyTimer.current) {
				clearTimeout(cleanupReadyTimer.current);
				cleanupReadyTimer.current = null;
			}
		};

		const unsubs = [
			listen("recording-started", () => {
				clearCleanupTimer();
				setPartial("");
				setStatus("recording");
			}),
			listen<{ text: string }>("streaming-partial", (e) => {
				const t = e.payload?.text?.trim() ?? "";
				if (t) setPartial(t);
			}),
			listen("recording-stopped", () => {
				setPartial("");
				setStatus("transcribing");
			}),
			// Blocking cleanup mode only — background mode never emits this.
			listen("cleanup-started", () => setStatus("cleaning")),
			// Paste-then-refine: raw paste is done; go idle immediately.
			// cleanup-ready may re-open the chip a moment later if polish differs.
			listen("dictation-complete", () => {
				setPartial("");
				setStatus((prev) => (prev === "cleanup-ready" ? prev : "idle"));
			}),
			listen("cleanup-ready", () => {
				clearCleanupTimer();
				setStatus("cleanup-ready");
				cleanupReadyTimer.current = setTimeout(() => {
					setStatus((prev) => (prev === "cleanup-ready" ? "idle" : prev));
					cleanupReadyTimer.current = null;
				}, CLEANUP_READY_MS);
			}),
			listen("cleanup-applied", () => {
				clearCleanupTimer();
				setStatus("idle");
			}),
		];
		return () => {
			clearCleanupTimer();
			unsubs.forEach((p) => p.then((f) => f()));
		};
	}, []);

	const shape: "idle" | "active" | "cleanup-ready" | "streaming" =
		status === "idle"
			? "idle"
			: status === "cleanup-ready"
				? "cleanup-ready"
				: status === "recording" && partial
					? "streaming"
					: "active";

	useEffect(() => {
		if (!placed.current) {
			placed.current = true;
			void initialPlacement(shape);
		} else {
			void resizeAnchored(shape);
		}
	}, [shape]);

	const handlePointerDown = (e: React.PointerEvent) => {
		// Mouse-only drag. Start tracking on press; if the cursor moves past a
		// small threshold before release, hand off to the OS via startDragging.
		// Otherwise treat as a click and toggle recording.
		if (e.button !== 0) return;
		const startX = e.clientX;
		const startY = e.clientY;
		let dragging = false;

		const onMove = (ev: PointerEvent) => {
			if (dragging) return;
			if (
				Math.abs(ev.clientX - startX) > DRAG_THRESHOLD ||
				Math.abs(ev.clientY - startY) > DRAG_THRESHOLD
			) {
				dragging = true;
				cleanup();
				void getCurrentWindow().startDragging();
			}
		};

		const onUp = () => {
			cleanup();
			if (!dragging && (status === "idle" || status === "recording")) {
				void invoke("toggle_recording");
			}
		};

		const cleanup = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			window.removeEventListener("pointercancel", cleanup);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		window.addEventListener("pointercancel", cleanup);
	};

	return (
		<div className="w-screen h-screen overflow-hidden bg-transparent flex items-end justify-start">
			<AnimatePresence mode="wait" initial={false}>
				{shape === "idle" ? (
					<IdleOrb key="idle" onPointerDown={handlePointerDown} />
				) : (
					<ActiveChip
						key="active"
						status={status}
						partial={partial}
						onPointerDown={handlePointerDown}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

async function initialPlacement(
	shape: "idle" | "active" | "cleanup-ready" | "streaming",
) {
	const { w, h } = SIZES[shape];
	const win = getCurrentWindow();
	try {
		await win.setSize(new LogicalSize(w, h));
		const monitor = await currentMonitor();
		if (!monitor) return;
		const scale = monitor.scaleFactor;
		const monLogicalX = monitor.position.x / scale;
		const monLogicalY = monitor.position.y / scale;
		const monLogicalH = monitor.size.height / scale;
		const x = monLogicalX + MARGIN;
		const y = monLogicalY + monLogicalH - h - MARGIN;
		await win.setPosition(new LogicalPosition(x, y));
	} catch (e) {
		console.error("HUD placement failed", e);
	}
}

// Keep the HUD anchored to its current center across resizes so the chip
// expands outward from the icon's position rather than growing from a corner.
async function resizeAnchored(
	shape: "idle" | "active" | "cleanup-ready" | "streaming",
) {
	const { w, h } = SIZES[shape];
	const win = getCurrentWindow();
	try {
		const monitor = await currentMonitor();
		const scale = monitor?.scaleFactor ?? 1;
		const pos = await win.outerPosition();
		const size = await win.outerSize();
		const curCenterX = (pos.x + size.width / 2) / scale;
		const curCenterY = (pos.y + size.height / 2) / scale;
		await win.setSize(new LogicalSize(w, h));
		await win.setPosition(
			new LogicalPosition(curCenterX - w / 2, curCenterY - h / 2),
		);
	} catch (e) {
		console.error("HUD resize failed", e);
	}
}

function IdleOrb({
	onPointerDown,
}: {
	onPointerDown: (e: React.PointerEvent) => void;
}) {
	return (
		<motion.button
			type="button"
			onPointerDown={onPointerDown}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 0.45, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			whileHover={{ opacity: 1, scale: 1.1 }}
			whileTap={{ scale: 0.95 }}
			transition={{ duration: 0.18 }}
			className="w-7 h-7 flex items-center justify-center cursor-grab active:cursor-grabbing bg-transparent border-0 p-0"
			aria-label="Start dictation"
		>
			<img
				src="/parrot-transparent.png"
				alt="Parrot"
				className="w-7 h-7 pointer-events-none"
			/>
		</motion.button>
	);
}

function ActiveChip({
	status,
	partial,
	onPointerDown,
}: {
	status: HudStatus;
	partial: string;
	onPointerDown: (e: React.PointerEvent) => void;
}) {
	const clickable = status === "recording" || status === "cleanup-ready";

	const handlePointerDown = (e: React.PointerEvent) => {
		if (status === "cleanup-ready") {
			// Click applies polish; don't start a drag-vs-click dance that
			// would also toggle recording.
			if (e.button !== 0) return;
			e.stopPropagation();
			void invoke("apply_pending_cleanup");
			return;
		}
		onPointerDown(e);
	};

	return (
		<motion.button
			type="button"
			onPointerDown={handlePointerDown}
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.18 }}
			className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold text-white bg-pk-primary border-0 cursor-grab active:cursor-grabbing ${!clickable ? "pointer-events-auto" : ""}`}
			aria-label={
				status === "cleanup-ready"
					? "Apply cleanup"
					: clickable
						? "Stop dictation"
						: status
			}
		>
			<AnimatePresence mode="wait" initial={false}>
				{status === "recording" && (
					<RecordingContent key="recording" partial={partial} />
				)}
				{status === "transcribing" && (
					<ProcessingContent key="transcribing" label="Transcribing…" />
				)}
				{status === "cleaning" && (
					<ProcessingContent key="cleaning" label="Cleaning up…" />
				)}
				{status === "cleanup-ready" && (
					<CleanupReadyContent key="cleanup-ready" />
				)}
			</AnimatePresence>
		</motion.button>
	);
}

function CleanupReadyContent() {
	const isMac =
		typeof navigator !== "undefined" &&
		/Mac|iPhone|iPad/.test(navigator.platform);
	const shortcut = isMac ? "⌘⇧C" : "Ctrl+⇧C";
	return (
		<motion.span
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.12 }}
			className="flex items-center gap-2"
		>
			<span className="opacity-90">✨</span>
			<span>
				<kbd className="font-mono opacity-90">{shortcut}</kbd> polish
			</span>
		</motion.span>
	);
}

function RecordingContent({ partial }: { partial: string }) {
	const [elapsed, setElapsed] = useState(0);
	const startedAt = useRef(Date.now());

	useEffect(() => {
		startedAt.current = Date.now();
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
		}, 250);
		return () => clearInterval(interval);
	}, []);

	const mins = Math.floor(elapsed / 60);
	const secs = elapsed % 60;

	// Show the tail of the partial so the latest words stay visible.
	const display =
		partial.length > 36 ? `…${partial.slice(-34).trimStart()}` : partial;

	return (
		<motion.span
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.12 }}
			className="flex items-center gap-2 min-w-0 max-w-full"
		>
			<span className="w-2 h-2 bg-white rounded-full animate-blink shrink-0" />
			{display ? (
				<span className="truncate opacity-95 font-medium tracking-tight">
					{display}
				</span>
			) : (
				<>
					<span className="flex items-center gap-[2px] h-3 shrink-0">
						{[0, 1, 2, 3, 4].map((i) => (
							<span
								key={i}
								className="w-[2px] h-1.5 bg-white rounded-sm animate-waveform"
								style={{ animationDelay: `${i * 0.12}s` }}
							/>
						))}
					</span>
					<span className="tabular-nums opacity-90 shrink-0">
						{mins}:{secs.toString().padStart(2, "0")}
					</span>
				</>
			)}
		</motion.span>
	);
}

function ProcessingContent({ label }: { label: string }) {
	return (
		<motion.span
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.12 }}
			className="flex items-center gap-2"
		>
			<span className="w-2.5 h-2.5 border-2 border-white/40 border-t-white rounded-full animate-spin-fast" />
			<span>{label}</span>
		</motion.span>
	);
}
