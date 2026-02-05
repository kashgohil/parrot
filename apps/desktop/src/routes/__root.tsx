import { DoodleBackground } from "@/components/doodle-background";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { SubscriptionProvider } from "@/lib/subscription";
import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BookA, CircleCheck, House, Settings, User } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createRootRoute({
	component: RootLayout,
});

type AppStatus = "idle" | "recording" | "transcribing" | "cleaning";

interface DictationResult {
	raw_text: string;
	cleaned_text: string;
	pasted: boolean;
}

function RootLayout() {
	const { isAuthenticated, isLoading, user, justLoggedIn, clearJustLoggedIn } =
		useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [showWelcome, setShowWelcome] = useState(false);

	// Show welcome screen after login
	useEffect(() => {
		if (justLoggedIn && isAuthenticated) {
			setShowWelcome(true);
			const timer = setTimeout(() => {
				setShowWelcome(false);
				clearJustLoggedIn();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [justLoggedIn, isAuthenticated, clearJustLoggedIn]);

	// Auth redirect logic — skip while welcome screen is showing
	useEffect(() => {
		if (isLoading || showWelcome) return;

		const isAuthRoute =
			location.pathname.startsWith("/login") ||
			location.pathname.startsWith("/signup");
		const onboardingPaths = [
			"/setup-mode",
			"/cloud-setup",
			"/local-setup",
			"/tour",
		];
		const isOnboardingRoute = onboardingPaths.some((p) =>
			location.pathname.startsWith(p),
		);

		if (!isAuthenticated && !isAuthRoute) {
			navigate({ to: "/login" });
		} else if (
			isAuthenticated &&
			!user?.onboarding_completed &&
			!isOnboardingRoute
		) {
			navigate({ to: "/setup-mode" });
		} else if (
			isAuthenticated &&
			user?.onboarding_completed &&
			(isOnboardingRoute || isAuthRoute)
		) {
			navigate({ to: "/" });
		}
	}, [
		isAuthenticated,
		isLoading,
		user,
		location.pathname,
		navigate,
		showWelcome,
	]);

	// Welcome animation after login
	if (showWelcome) {
		return <WelcomeScreen name={user?.name} />;
	}

	// Check if we should render the full layout or just the outlet
	const isAuthRoute =
		location.pathname.startsWith("/login") ||
		location.pathname.startsWith("/signup");
	const onboardingPaths = [
		"/setup-mode",
		"/cloud-setup",
		"/local-setup",
		"/tour",
	];
	const isOnboardingRoute = onboardingPaths.some((p) =>
		location.pathname.startsWith(p),
	);

	// For auth and onboarding routes, just render the outlet (they have their own layouts)
	if (isAuthRoute || isOnboardingRoute) {
		return <Outlet />;
	}

	// Show loading while checking auth
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	}

	// If not authenticated, don't render the main layout
	if (!isAuthenticated) {
		return null;
	}

	return (
		<SubscriptionProvider>
			<AuthenticatedLayout />
		</SubscriptionProvider>
	);
}

function WelcomeScreen({ name }: { name?: string | null }) {
	const [phase, setPhase] = useState<"enter" | "exit">("enter");

	useEffect(() => {
		const timer = setTimeout(() => setPhase("exit"), 1400);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div
			className={`min-h-screen flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
				phase === "exit" ? "opacity-0" : "opacity-100"
			}`}
		>
			<div className="animate-fade-in-up flex flex-col items-center gap-4">
				<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-welcome-pop">
					<CircleCheck className="w-8 h-8 text-primary animate-welcome-check" />
				</div>
				<div className="text-center">
					<h1 className="text-2xl font-semibold text-foreground">
						{name ? `Welcome back, ${name.split(" ")[0]}` : "Welcome back"}
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Setting things up...
					</p>
				</div>
			</div>
		</div>
	);
}

function AuthenticatedLayout() {
	const { user, logout } = useAuth();
	const [status, setStatus] = useState<AppStatus>("idle");
	const [result, setResult] = useState<DictationResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const unsubs = [
			listen("recording-started", () => {
				setStatus("recording");
				setResult(null);
				setError(null);
			}),
			listen<number>("recording-stopped", async () => {
				setStatus("transcribing");
				try {
					const res = await invoke<DictationResult>("transcribe_last");
					setResult(res);
				} catch (e) {
					setError(String(e));
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
		<div className="flex h-screen relative">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel — branding & navigation */}
			<div className="hidden md:flex md:w-[220px] lg:w-[280px] xl:w-[340px] 2xl:w-[400px] bg-primary flex-col justify-between p-6 lg:p-8 xl:p-10 relative overflow-hidden shrink-0">
				{/* Background decoration */}
				<div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
				<div className="absolute top-1/2 right-10 w-40 h-40 bg-white/5 rounded-full" />

				<div className="relative flex items-center gap-3 z-10">
					<img
						src="/parrot-transparent.png"
						alt="Parrot"
						className="w-12 h-12 drop-shadow-lg"
					/>
					<div className="flex flex-col">
						<h1 className="text-3xl font-bold text-primary-foreground">
							Parrot
						</h1>
					</div>
				</div>

				{/* Navigation */}
				<nav className="relative z-10 flex flex-col gap-1">
					<Link
						to="/"
						className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 [&.active]:bg-white/20 [&.active]:text-primary-foreground"
						activeProps={{ className: "active" }}
					>
						<House className="w-4 h-4" />
						Home
					</Link>
					<Link
						to="/vocabulary"
						className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 [&.active]:bg-white/20 [&.active]:text-primary-foreground"
						activeProps={{ className: "active" }}
					>
						<BookA className="w-4 h-4" />
						Vocabulary
					</Link>
					<Link
						to="/settings"
						className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 [&.active]:bg-white/20 [&.active]:text-primary-foreground"
						activeProps={{ className: "active" }}
					>
						<Settings className="w-4 h-4" />
						Settings
					</Link>
					<Link
						to="/profile"
						className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 [&.active]:bg-white/20 [&.active]:text-primary-foreground"
						activeProps={{ className: "active" }}
					>
						<User className="w-4 h-4" />
						Profile
					</Link>
				</nav>

				<div className="relative z-10">
					<p className="text-primary-foreground/40 text-xs mb-2">
						{user?.email}
					</p>
					<button
						onClick={logout}
						className="text-primary-foreground/50 hover:text-primary-foreground text-xs transition-colors"
					>
						Sign out
					</button>
				</div>
			</div>

			{/* Right panel — content */}
			<div className="flex-1 flex flex-col bg-background relative overflow-hidden">
				<DoodleBackground opacity={0.07} />
				<div
					data-tauri-drag-region
					className="h-8 shrink-0 cursor-default md:hidden"
				/>
				{/* Mobile nav */}
				<div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background relative z-10">
					<div className="flex items-center gap-2">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-8 h-8"
						/>
						<span className="font-bold text-primary">Parrot</span>
					</div>
					<div className="flex gap-1">
						<Link
							to="/"
							className="px-3 py-1.5 rounded-md text-xs font-medium no-underline text-muted-foreground hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
							activeProps={{ className: "active" }}
						>
							Home
						</Link>
						<Link
							to="/vocabulary"
							className="px-3 py-1.5 rounded-md text-xs font-medium no-underline text-muted-foreground hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
							activeProps={{ className: "active" }}
						>
							Vocabulary
						</Link>
						<Link
							to="/settings"
							className="px-3 py-1.5 rounded-md text-xs font-medium no-underline text-muted-foreground hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
							activeProps={{ className: "active" }}
						>
							Settings
						</Link>
						<Link
							to="/profile"
							className="px-3 py-1.5 rounded-md text-xs font-medium no-underline text-muted-foreground hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
							activeProps={{ className: "active" }}
						>
							Profile
						</Link>
					</div>
				</div>
				<main className="flex-1 overflow-y-auto relative z-10">
					<div className="max-w-2xl mx-auto w-full px-6 py-8">
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
			{error && (
				<ErrorOverlay message={error} onDismiss={() => setError(null)} />
			)}
		</div>
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
		<div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-sm font-semibold text-white bg-pk-accent/90 shadow-[0_4px_20px_rgba(255,112,67,0.4)] animate-pulse-glow">
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
		<div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-sm font-semibold text-white bg-blue-500/90 shadow-[0_4px_20px_rgba(59,130,246,0.4)]">
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
			className="fixed top-5 right-5 z-[1000] bg-card border border-border rounded-xl px-[18px] py-3.5 max-w-[400px] cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
			onClick={onDismiss}
		>
			<p className="text-sm leading-relaxed text-foreground">{display}</p>
			{result.pasted ? (
				<Badge className="mt-2 bg-pk-badge-green/20 text-pk-badge-green border-pk-badge-green/30">
					Pasted
				</Badge>
			) : (
				<Badge variant="secondary" className="mt-2">
					Copied to clipboard
				</Badge>
			)}
		</div>
	);
}

function ErrorOverlay({
	message,
	onDismiss,
}: {
	message: string;
	onDismiss: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(onDismiss, 5000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	return (
		<div
			className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-[13px] font-normal text-white bg-red-500/90 max-w-[400px] cursor-pointer"
			onClick={onDismiss}
		>
			<span>{message}</span>
		</div>
	);
}
