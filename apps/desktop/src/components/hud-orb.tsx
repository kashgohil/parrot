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

type HudStatus = "idle" | "recording" | "transcribing" | "cleaning";

// Two outer shapes only — the orb (idle) and the active chip. The chip stays
// mounted across recording/transcribing/cleaning, with only its inner content
// swapping. Avoids the pop-out/pop-in jitter of remounting between states.
const SIZES: Record<"idle" | "active", { w: number; h: number }> = {
	idle: { w: 36, h: 36 },
	active: { w: 160, h: 34 },
};

const MARGIN = 24;

export function HudOrb() {
	const [status, setStatus] = useState<HudStatus>("idle");

	useEffect(() => {
		const unsubs = [
			listen("recording-started", () => setStatus("recording")),
			listen("recording-stopped", () => setStatus("transcribing")),
			listen("cleanup-started", () => setStatus("cleaning")),
			listen("dictation-complete", () => setStatus("idle")),
		];
		return () => {
			unsubs.forEach((p) => p.then((f) => f()));
		};
	}, []);

	const shape: "idle" | "active" = status === "idle" ? "idle" : "active";

	useEffect(() => {
		void resizeForShape(shape);
	}, [shape]);

	const handleClick = () => {
		// Only meaningful while idle (start) or recording (stop). During
		// processing it's a no-op so a misclick doesn't kick off a new take.
		if (status === "idle" || status === "recording") {
			void invoke("toggle_recording");
		}
	};

	return (
		<div className="w-screen h-screen overflow-hidden bg-transparent flex items-end justify-start">
			<AnimatePresence mode="wait" initial={false}>
				{shape === "idle" ? (
					<IdleOrb key="idle" onClick={handleClick} />
				) : (
					<ActiveChip key="active" status={status} onClick={handleClick} />
				)}
			</AnimatePresence>
		</div>
	);
}

async function resizeForShape(shape: "idle" | "active") {
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
		console.error("HUD resize failed", e);
	}
}

function IdleOrb({ onClick }: { onClick: () => void }) {
	return (
		<motion.button
			type="button"
			onClick={onClick}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 0.45, scale: 1 }}
			exit={{ opacity: 0, scale: 0.8 }}
			whileHover={{ opacity: 1, scale: 1.1 }}
			whileTap={{ scale: 0.95 }}
			transition={{ duration: 0.18 }}
			className="w-7 h-7 flex items-center justify-center cursor-pointer bg-transparent border-0 p-0"
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
	onClick,
}: {
	status: HudStatus;
	onClick: () => void;
}) {
	const clickable = status === "recording";
	return (
		<motion.button
			type="button"
			onClick={onClick}
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 6 }}
			transition={{ duration: 0.18 }}
			className={`flex items-center justify-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold text-white bg-pk-primary border-0 ${clickable ? "cursor-pointer" : "cursor-default"}`}
			aria-label={clickable ? "Stop dictation" : status}
		>
			<AnimatePresence mode="wait" initial={false}>
				{status === "recording" && (
					<RecordingContent key="recording" />
				)}
				{status === "transcribing" && (
					<ProcessingContent key="transcribing" label="Transcribing…" />
				)}
				{status === "cleaning" && (
					<ProcessingContent key="cleaning" label="Cleaning up…" />
				)}
			</AnimatePresence>
		</motion.button>
	);
}

function RecordingContent() {
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

	return (
		<motion.span
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.12 }}
			className="flex items-center gap-2"
		>
			<span className="w-2 h-2 bg-white rounded-full animate-blink" />
			<span className="flex items-center gap-[2px] h-3">
				{[0, 1, 2, 3, 4].map((i) => (
					<span
						key={i}
						className="w-[2px] h-1.5 bg-white rounded-sm animate-waveform"
						style={{ animationDelay: `${i * 0.12}s` }}
					/>
				))}
			</span>
			<span className="tabular-nums opacity-90">
				{mins}:{secs.toString().padStart(2, "0")}
			</span>
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
