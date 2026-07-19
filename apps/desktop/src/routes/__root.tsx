import { DoodleBackground } from "@/components/doodle-background";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import {
	installGlobalErrorHandlers,
	showAccessibilityPermissionToast,
	showError,
} from "@/lib/errors";
import { useUpdater } from "@/lib/updater";
import {
	isMissing,
	openPermissionSettings,
	usePermissions,
	type PermissionState,
} from "@/lib/permissions";
import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	AlertTriangle,
	ArrowDownToLine,
	BookA,
	ExternalLink,
	History,
	Loader2,
	Settings,
	Sparkles,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export const Route = createRootRoute({
	component: RootLayout,
});

type AppStatus = "idle" | "recording" | "transcribing" | "cleaning";

interface DictationResult {
	raw_text: string;
	cleaned_text: string;
	pasted: boolean;
}

const ONBOARDING_PATHS = ["/local-profile", "/local-setup", "/tour"];

function RootLayout() {
	const { isLoading, user } = useAuth();
	const location = useLocation();
	const navigate = useNavigate();

	useEffect(() => {
		installGlobalErrorHandlers();

		const unlisten = listen<{ details?: string }>(
			"paste-permission-needed",
			(event) => {
				showAccessibilityPermissionToast(event.payload?.details);
			},
		);
		return () => {
			unlisten.then((fn) => fn());
		};
	}, []);

	// Local-only: send first-run users through profile → setup → tour.
	useEffect(() => {
		if (isLoading) return;

		const onOnboarding = ONBOARDING_PATHS.some((p) =>
			location.pathname.startsWith(p),
		);
		if (onOnboarding) return;

		if (!user?.onboarding_completed) {
			if (!user?.name) {
				navigate({ to: "/local-profile" });
			} else {
				navigate({ to: "/local-setup" });
			}
		}
	}, [isLoading, user, location.pathname, navigate]);

	const onOnboarding = ONBOARDING_PATHS.some((p) =>
		location.pathname.startsWith(p),
	);

	let content: React.ReactNode;
	if (onOnboarding) {
		content = <Outlet />;
	} else if (isLoading) {
		content = (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	} else if (!user?.onboarding_completed) {
		// Redirect in progress
		content = (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	} else {
		content = <MainShell />;
	}

	return (
		<>
			{content}
			<Toaster position="bottom-right" richColors closeButton />
		</>
	);
}

function MainShell() {
	const { user } = useAuth();
	const [status, setStatus] = useState<AppStatus>("idle");
	const [result, setResult] = useState<DictationResult | null>(null);
	const updater = useUpdater();

	useEffect(() => {
		const unsubs = [
			listen("recording-started", () => {
				setStatus("recording");
				setResult(null);
			}),
			listen<number>("recording-stopped", async () => {
				setStatus("transcribing");
				try {
					const res = await invoke<DictationResult>("transcribe_last");
					setResult(res);
				} catch (e) {
					showError(e, { context: "transcribing your dictation" });
				}
				setStatus("idle");
			}),
			listen("cleanup-started", () => {
				setStatus("cleaning");
			}),
		];
		return () => {
			unsubs.forEach((p) => p.then((f) => f()));
		};
	}, []);

	return (
		<div className="flex h-screen relative bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left Sidebar */}
			<div className="hidden md:flex md:w-[240px] lg:w-[260px] bg-pk-primary flex-col relative overflow-hidden shrink-0">
				<div className="absolute -top-24 -right-24 w-72 h-72 bg-white/8 rounded-full blur-2xl" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/6 rounded-full blur-2xl" />

				<div className="relative z-10 p-6 lg:p-7">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-8 h-8 drop-shadow-md"
							/>
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white tracking-tight">
								Parrot
							</h1>
							<p className="text-white/60 text-xs font-medium">
								Private. On-device. Always.
							</p>
						</div>
					</div>
				</div>

				<nav className="relative z-10 flex-1 px-4 py-4">
					<div className="space-y-1">
						<NavLink to="/" icon={History} label="History" />
						<NavLink to="/vocabulary" icon={BookA} label="Vocabulary" />
						<NavLink to="/settings" icon={Settings} label="Settings" />
						<NavLink to="/profile" icon={User} label="Profile" />
					</div>
				</nav>

				<UpdateBanner updater={updater} />

				<div className="relative z-10 p-4 lg:p-6">
					<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
						<div className="flex items-center gap-3">
							<div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
								<User className="w-4 h-4 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-white truncate">
									{user?.name || "You"}
								</p>
								<p className="text-xs text-white/50 truncate">
									Local · on this Mac
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="flex-1 flex flex-col relative overflow-hidden">
				<DoodleBackground opacity={0.06} />

				<div
					data-tauri-drag-region
					className="h-8 shrink-0 cursor-default md:hidden"
				/>

				<div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm relative z-10">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-6 h-6"
							/>
						</div>
						<span className="font-bold text-foreground">Parrot</span>
					</div>
				</div>

				<div className="md:hidden flex items-center justify-around px-2 py-2 border-b border-border bg-background/80 backdrop-blur-sm relative z-10">
					<MobileNavLink to="/" icon={History} label="History" />
					<MobileNavLink to="/vocabulary" icon={BookA} label="Words" />
					<MobileNavLink to="/settings" icon={Settings} label="Settings" />
					<MobileNavLink to="/profile" icon={User} label="Profile" />
				</div>

				<PermissionsBanner />
				<ParakeetUpgradeBanner />

				<main className="flex-1 overflow-y-auto relative z-10">
					<div className="max-w-3xl mx-auto w-full px-5 py-6 lg:py-8">
						<Outlet />
					</div>
				</main>
			</div>

			{status === "recording" && <RecordingOverlay />}
			{status === "transcribing" && (
				<ProcessingOverlay label="Transcribing..." />
			)}
			{status === "cleaning" && <ProcessingOverlay label="Cleaning up..." />}
			{result && (
				<ResultOverlay result={result} onDismiss={() => setResult(null)} />
			)}
		</div>
	);
}

function NavLink({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={`
				flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline
				transition-all duration-200
				${
					isActive
						? "bg-white/20 text-white shadow-lg shadow-black/5"
						: "text-white/70 hover:text-white hover:bg-white/10"
				}
			`}
		>
			<Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
			{label}
		</Link>
	);
}

function MobileNavLink({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={`
				flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium no-underline
				transition-all duration-200
				${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}
			`}
		>
			<div
				className={`p-2 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}
			>
				<Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
			</div>
			{label}
		</Link>
	);
}

function RecordingOverlay() {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
		return () => clearInterval(interval);
	}, []);

	const mins = Math.floor(elapsed / 60);
	const secs = elapsed % 60;

	return (
		<div className="fixed top-5 right-5 z-1000 flex items-center gap-2.5 px-[18px] py-2.5 rounded-2xl text-sm font-semibold text-white bg-pk-accent shadow-lg animate-pulse-glow">
			<div className="w-2.5 h-2.5 bg-white rounded-full animate-blink" />
			<div className="flex items-center gap-0.5 h-[18px]">
				{[...Array(5)].map((_, i) => (
					<div
						key={i}
						className="w-[3px] h-1.5 bg-white rounded-sm animate-waveform"
						style={{ animationDelay: `${i * 0.12}s` }}
					/>
				))}
			</div>
			<span>Recording</span>
			<span className="tabular-nums opacity-80">
				{mins}:{secs.toString().padStart(2, "0")}
			</span>
		</div>
	);
}

function ProcessingOverlay({ label }: { label: string }) {
	return (
		<div className="fixed top-5 right-5 z-1000 flex items-center gap-2.5 px-[18px] py-2.5 rounded-2xl text-sm font-semibold text-white bg-blue-500 shadow-lg">
			<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-fast" />
			<span>{label}</span>
		</div>
	);
}

function ResultOverlay({
	result,
	onDismiss,
}: {
	result: DictationResult;
	onDismiss: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(onDismiss, 6000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	const display = result.cleaned_text || result.raw_text;

	return (
		<div
			className="fixed top-5 right-5 z-1000 bg-card border border-border rounded-2xl px-5 py-4 max-w-[420px] cursor-pointer shadow-xl animate-slide-in-right"
			onClick={onDismiss}
		>
			<div className="flex items-start gap-3">
				<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
					<Sparkles className="w-4 h-4 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm leading-relaxed text-foreground line-clamp-3">
						{display}
					</p>
					{result.pasted ? (
						<Badge className="mt-3 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
							Pasted successfully
						</Badge>
					) : (
						<Badge variant="secondary" className="mt-3">
							Copied to clipboard
						</Badge>
					)}
				</div>
			</div>
		</div>
	);
}

function UpdateBanner({
	updater,
}: {
	updater: ReturnType<typeof useUpdater>;
}) {
	const { phase, availableVersion, error, apply, dismiss } = updater;

	if (phase !== "ready" && phase !== "installing" && phase !== "error") {
		return null;
	}

	const busy = phase === "installing";

	return (
		<div className="relative z-10 px-4 lg:px-6 pb-3">
			<button
				type="button"
				onClick={busy ? undefined : apply}
				disabled={busy}
				className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 transition-all text-left disabled:cursor-default disabled:hover:bg-white/10"
			>
				<div className="w-7 h-7 shrink-0 rounded-md bg-white/15 flex items-center justify-center">
					{busy ? (
						<Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
					) : (
						<ArrowDownToLine className="w-3.5 h-3.5 text-white" />
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-xs font-medium text-white truncate">
						{phase === "ready" && "Restart to update"}
						{phase === "installing" && "Installing…"}
						{phase === "error" && "Update failed"}
					</p>
					<p className="text-[11px] text-white/55 truncate">
						{phase === "ready" && availableVersion
							? `v${availableVersion} is ready`
							: phase === "installing"
								? "Relaunching shortly"
								: error || "Tap to retry"}
					</p>
				</div>
				{phase === "ready" && (
					<span
						role="button"
						aria-label="Dismiss"
						onClick={(e) => {
							e.stopPropagation();
							dismiss();
						}}
						className="text-white/40 hover:text-white/80 text-xs px-1"
					>
						×
					</span>
				)}
			</button>
		</div>
	);
}

interface MissingPermission {
	key: "accessibility" | "microphone";
	label: string;
	state: PermissionState;
}

function PermissionsBanner() {
	const status = usePermissions();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	const missing: MissingPermission[] = [];
	if (isMissing(status.microphone)) {
		missing.push({
			key: "microphone",
			label: "Microphone",
			state: status.microphone,
		});
	}
	if (isMissing(status.accessibility)) {
		missing.push({
			key: "accessibility",
			label: "Accessibility",
			state: status.accessibility,
		});
	}

	const visible = missing.filter((p) => !dismissed.has(p.key));
	if (visible.length === 0) return null;

	const first = visible[0];
	const extraCount = visible.length - 1;
	const headline =
		extraCount > 0
			? `Parrot needs ${first.label} permission (+${extraCount} more)`
			: `Parrot needs ${first.label} permission`;
	const detail =
		first.key === "microphone"
			? "Without it, dictation can't capture audio."
			: "Without it, Parrot can't paste your dictation into other apps.";

	return (
		<div className="shrink-0 relative z-10 border-b border-amber-200 bg-amber-50 text-amber-900 px-4 py-2.5">
			<div className="max-w-3xl mx-auto flex items-center gap-3">
				<AlertTriangle className="w-4 h-4 shrink-0" />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium leading-tight">{headline}</p>
					<p className="text-xs text-amber-800/80 leading-tight mt-0.5">
						{detail}
					</p>
				</div>
				<button
					type="button"
					onClick={() => {
						openPermissionSettings(first.key).catch((e) =>
							showError(e, { context: "opening System Settings" }),
						);
					}}
					className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-amber-900 text-amber-50 hover:bg-amber-950 transition-colors"
				>
					Open Settings
					<ExternalLink className="w-3 h-3" />
				</button>
				<button
					type="button"
					aria-label="Dismiss"
					onClick={() =>
						setDismissed((prev) => {
							const next = new Set(prev);
							next.add(first.key);
							return next;
						})
					}
					className="text-amber-900/60 hover:text-amber-900 text-base px-1"
				>
					×
				</button>
			</div>
		</div>
	);
}

const PARAKEET_BANNER_DISMISS_KEY = "parrot_dismiss_parakeet_banner";

function ParakeetUpgradeBanner() {
	const navigate = useNavigate();
	const [show, setShow] = useState(false);
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState<string | null>(null);

	useEffect(() => {
		if (typeof localStorage !== "undefined") {
			if (localStorage.getItem(PARAKEET_BANNER_DISMISS_KEY) === "1") {
				return;
			}
		}
		invoke<{ engine: string; can_upgrade_to_parakeet?: boolean }>(
			"get_stt_status",
		)
			.then((s) => {
				if (s.engine !== "parakeet") setShow(true);
			})
			.catch(() => {});
	}, []);

	if (!show) return null;

	async function upgrade() {
		setBusy(true);
		setProgress("Starting download…");
		try {
			const unsub = await listen<{ message: string; progress: number }>(
				"stt-model-download-progress",
				(e) => {
					setProgress(
						`${e.payload.message} (${Math.round(e.payload.progress)}%)`,
					);
				},
			);
			await invoke("switch_stt_model", { modelId: "parakeet-v3" });
			unsub();
			setProgress("Parakeet ready");
			setShow(false);
			if (typeof localStorage !== "undefined") {
				localStorage.setItem(PARAKEET_BANNER_DISMISS_KEY, "1");
			}
		} catch (e) {
			console.error(e);
			setProgress(`Failed: ${e instanceof Error ? e.message : String(e)}`);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="shrink-0 relative z-10 border-b border-sky-200 bg-sky-50 text-sky-950 px-4 py-2.5">
			<div className="max-w-3xl mx-auto flex items-center gap-3">
				<Sparkles className="w-4 h-4 shrink-0 text-sky-600" />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium leading-tight">
						Faster, more accurate dictation is available
					</p>
					<p className="text-xs text-sky-900/75 leading-tight mt-0.5">
						{progress ||
							"Switch to Parakeet (~450 MB) — more accurate than models 10× its size. Your Whisper model stays on disk."}
					</p>
				</div>
				<button
					type="button"
					disabled={busy}
					onClick={() => void upgrade()}
					className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-sky-700 text-white hover:bg-sky-800 disabled:opacity-60 transition-colors shrink-0"
				>
					{busy ? (
						<>
							<Loader2 className="w-3 h-3 animate-spin" />
							Upgrading…
						</>
					) : (
						"Upgrade to Parakeet"
					)}
				</button>
				<button
					type="button"
					onClick={() => navigate({ to: "/settings" })}
					className="text-xs font-medium text-sky-800/80 hover:text-sky-950 underline shrink-0 hidden sm:inline"
				>
					Settings
				</button>
				<button
					type="button"
					aria-label="Dismiss"
					onClick={() => {
						setShow(false);
						if (typeof localStorage !== "undefined") {
							localStorage.setItem(PARAKEET_BANNER_DISMISS_KEY, "1");
						}
					}}
					className="text-sky-900/50 hover:text-sky-950 text-base px-1"
				>
					×
				</button>
			</div>
		</div>
	);
}
